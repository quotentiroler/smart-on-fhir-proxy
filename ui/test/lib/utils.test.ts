import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility', () => {
  it('merges class names with conditional and array values', () => {
    const result = cn('px-2', null, undefined, false, 'text-sm', { 'text-lg': false, 'font-bold': true }, ['mx-1', 'px-2'])
    const tokens = result.split(/\s+/).filter(Boolean)

    expect(tokens).toContain('px-2')
    expect(tokens).toContain('text-sm')
    expect(tokens).toContain('font-bold')
    expect(tokens).toContain('mx-1')
    expect(tokens).not.toContain('text-lg')

    // ensure duplicates are resolved sensibly (e.g., px-2 appears only once)
    expect(tokens.filter((t) => t === 'px-2')).toHaveLength(1)
  })

  it('handles simple strings and conditionals', () => {
    const result = cn('a', { b: true, c: false }, ['d', null, 'a'])
    const tokens = result.split(/\s+/).filter(Boolean)

    expect(tokens).toContain('a')
    expect(tokens).toContain('b')
    expect(tokens).toContain('d')
    expect(tokens).not.toContain('c')
    // twMerge doesn't dedupe non-conflicting identical classes, so 'a' appears twice
    expect(tokens.filter((t) => t === 'a')).toHaveLength(2)
  })
})
