import os
import shutil
import json
from g4f.client import Client
import g4f.Provider
import concurrent.futures

# Initialize the GPT-4 client
client = Client()

# Build initial provider list
providers = [
    getattr(g4f.Provider, name)
    for name in dir(g4f.Provider)
    if not name.startswith("__")
    and callable(getattr(g4f.Provider, name))
    and name != "DDG"
]

# Keep track of providers that have failed
bad_providers: set = set()

# Directory containing translation files (absolute path)
script_dir = os.path.dirname(os.path.abspath(__file__))
translations_dir = os.path.join(script_dir, "translations")


# Function to read a JSON file
def read_json_file(file_path):
    try:
        with open(file_path, "r", encoding="utf-8") as file:
            content = file.read().strip()
            if not content:
                print(
                    f"Warning: {file_path} is empty. Initializing as an empty JSON object."
                )
                return {}
            return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Error reading JSON file {file_path}: {e}")
        return {}


# Function to write a JSON file
def write_json_file(file_path, data):
    try:
        if not isinstance(data, dict):
            raise ValueError(f"Data to write is not a valid JSON object: {data}")
        with open(file_path, "w", encoding="utf-8") as file:
            json.dump(data, file, ensure_ascii=False, indent=2)
        print(f"Successfully wrote to {file_path}.")
    except ValueError as ve:
        print(f"ValueError while writing to {file_path}: {ve}")
    except Exception as e:
        print(f"Error writing to JSON file {file_path}: {e}")


def flatten_json(y):
    """Flatten a nested JSON object into a single-level dictionary."""
    out = {}

    def flatten(x, name=""):
        if type(x) is dict:
            for a in x:
                flatten(x[a], name + a + ".")
        elif type(x) is list:
            i = 0
            for a in x:
                flatten(a, name + str(i) + ".")
                i += 1
        else:
            out[name[:-1]] = x

    flatten(y)
    return out


def unflatten_json(flat_json):
    """Unflatten a flat dictionary with dot-notated keys into a nested JSON object."""
    nested_json = {}
    for key, value in flat_json.items():
        parts = key.split(".")
        current = nested_json
        for part in parts[:-1]:
            if part not in current:
                current[part] = {}
            elif not isinstance(current[part], dict):
                # Handle conflict: overwrite the existing value with a dictionary
                current[part] = {}
            current = current[part]
        current[parts[-1]] = value
    return nested_json


def prepare_translation_data():
    if not os.path.exists(translations_dir):
        raise FileNotFoundError(f"Translations directory not found: {translations_dir}")

    files = [f for f in os.listdir(translations_dir) if f.endswith(".json")]
    translations = {}

    # Load all translations
    for file in files:
        lang = os.path.splitext(file)[0]  # Extract language code from file name
        file_path = os.path.join(translations_dir, file)
        translations[lang] = read_json_file(file_path)

    # Extract keys and values for translation
    source_lang = "en"
    if source_lang not in translations:
        raise ValueError(f"Source language file '{source_lang}.json' not found.")

    source_translations = flatten_json(translations[source_lang])
    translation_data = {}

    for lang, translation in translations.items():
        if lang == source_lang:
            continue

        flattened_translation = flatten_json(translation)
        keys_to_translate = {}

        for key, value in flattened_translation.items():
            if (
                isinstance(value, str)
                and value.startswith("TODO: Translate")
                and key in source_translations
            ):
                keys_to_translate[key] = source_translations[key]

        if keys_to_translate:
            # Return the nested JSON structure
            translation_data[lang] = unflatten_json(keys_to_translate)

    return translation_data


def merge_nested_dicts(original, updates):
    """Recursively merge two dictionaries."""
    for key, value in updates.items():
        if (
            key in original
            and isinstance(original[key], dict)
            and isinstance(value, dict)
        ):
            # If both are dictionaries, merge them recursively
            merge_nested_dicts(original[key], value)
        else:
            # Otherwise, overwrite or add the key
            original[key] = value


def apply_translations(translated_data):
    if not os.path.exists(translations_dir):
        raise FileNotFoundError(f"Translations directory not found: {translations_dir}")

    for lang, translations in translated_data.items():
        file_path = os.path.join(translations_dir, f"{lang}.json")
        translation = read_json_file(file_path)

        # Recursively merge the nested translations with the existing translation
        merge_nested_dicts(translation, translations)

        write_json_file(file_path, translation)
        print(f"Updated {lang}.json with translated keys.")


def translate_todos_optimized():
    translation_data = prepare_translation_data()

    for lang, data in translation_data.items():
        # filter out any providers that have already errored
        effective_providers = [p for p in providers if p not in bad_providers]
        if not effective_providers:
            print(f"No working providers left for {lang}, skipping translation.")
            continue

        # Prepare the prompt with the nested JSON structure
        prompt = (
            f"Translate the following JSON object to {lang}. "
            "Keep the structure intact and return a JSON object with the translations:\n\n"
            f"{json.dumps(data, indent=2)}"
        )
        print(f"Prompt for {lang}: {prompt}")

        # Function to handle translation with a specific provider
        def translate_with_provider(provider):
            try:
                print(f"Attempting translation with provider: {provider.__name__}")
                response = client.chat.completions.create(
                    provider=provider,
                    messages=[
                        {"role": "system", "content": "You are a JSON translator."},
                        {"role": "user", "content": prompt},
                    ],
                    web_search=False,
                )
                return json.loads(response.choices[0].message.content.strip())
            except Exception as e:
                print(f"Error with provider {provider.__name__}: {e}")
                #if not "Expecting value" in str(e):
                bad_providers.add(provider)
                return None

        # Submit all translation requests simultaneously
        with concurrent.futures.ThreadPoolExecutor() as executor:
            futures = {
                executor.submit(translate_with_provider, p): p
                for p in effective_providers
            }

            # Wait for the first successful response
            successful = None
            for future in concurrent.futures.as_completed(futures):
                result = future.result()
                if result:
                    successful = result
                    print(f"Translated {lang} using {futures[future].__name__}")
                    # cancel the rest
                    for f in futures:
                        f.cancel()
                    break

            if successful:
                apply_translations({lang: successful})
            else:
                print(f"All remaining providers failed for {lang}.")

        # Move to the next language file
        print(f"Finished processing translations for {lang}.")


# Main function to sync and translate
def main():
    print("Translating TODOs...")
    translate_todos_optimized()
    print("Translation process completed.")


# Run the script
if __name__ == "__main__":
    main()
    # ─── CLEANUP ──────────────────────────────────────────────────────────────
    # remove any stray cache/folder artifacts
    for temp_dir in ["generated_media", "har_and_cookies"]:
        temp_path = os.path.join(script_dir, temp_dir)
        if os.path.isdir(temp_path):
            shutil.rmtree(temp_path)
            print(f"Removed leftover directory: {temp_path}")

    # ─── CLOSE GPT-4 CLIENT SESSION ─────────────────────────────────────────
    try:
        # g4f.Client often stores its aiohttp.ClientSession in ._session or .session
        session = getattr(client, "_session", None) or getattr(client, "session", None)
        if session and not getattr(session, "closed", True):
            session.close()
            print("Closed g4f client session.")
        # and close the connector if present
        connector = getattr(session, "connector", None)
        if connector and not getattr(connector, "closed", True):
            connector.close()
            print("Closed aiohttp connector.")
    except Exception as e:
        print(f"Error closing client session/connector: {e}")
