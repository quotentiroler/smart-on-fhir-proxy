import { Elysia, t } from 'elysia';
import { keycloakPlugin } from '../../lib/keycloak-plugin';
/**
 * SMART Launch Context Management - handles patient/encounter contexts
 */
export const launchContextRoutes = new Elysia({ prefix: '/admin/launch-contexts' })
    .use(keycloakPlugin)
    .get('/', async ({ getAdmin }) => {
    // Get users with launch context attributes
    const users = await getAdmin().users.find();
    return users
        .filter(user => user.attributes?.['launch_patient'] || user.attributes?.['launch_encounter'])
        .map(user => ({
        userId: user.id ?? '',
        username: user.username ?? '',
        launchPatient: user.attributes?.['launch_patient']?.[0] ?? '',
        launchEncounter: user.attributes?.['launch_encounter']?.[0] ?? ''
    }));
}, {
    response: t.Array(t.Object({
        userId: t.String({ description: 'User ID' }),
        username: t.String({ description: 'Username' }),
        launchPatient: t.String({ description: 'Patient context' }),
        launchEncounter: t.String({ description: 'Encounter context' })
    })),
    detail: {
        summary: 'List Launch Contexts',
        description: 'Get all users with launch context attributes',
        tags: ['launch-contexts']
    }
})
    .post('/:userId/patient/:patientId', async ({ getAdmin, params }) => {
    await getAdmin().users.update({ id: params.userId }, { attributes: { launch_patient: [params.patientId] } });
    return { success: true };
}, {
    response: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
    }),
    detail: {
        summary: 'Set Patient Context',
        description: 'Set the patient context for a user',
        tags: ['launch-contexts']
    }
})
    .post('/:userId/encounter/:encounterId', async ({ getAdmin, params }) => {
    await getAdmin().users.update({ id: params.userId }, { attributes: { launch_encounter: [params.encounterId] } });
    return { success: true };
}, {
    response: t.Object({
        success: t.Boolean({ description: 'Whether the update was successful' })
    }),
    detail: {
        summary: 'Set Encounter Context',
        description: 'Set the encounter context for a user',
        tags: ['launch-contexts']
    }
})
    .delete('/:userId/patient', async ({ getAdmin, params }) => {
    const user = await getAdmin().users.findOne({ id: params.userId });
    if (user?.attributes) {
        delete user.attributes.launch_patient;
        await getAdmin().users.update({ id: params.userId }, { attributes: user.attributes });
    }
    return { success: true };
}, {
    response: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
    }),
    detail: {
        summary: 'Remove Patient Context',
        description: 'Remove the patient context for a user',
        tags: ['launch-contexts']
    }
})
    .delete('/:userId/encounter', async ({ getAdmin, params }) => {
    const user = await getAdmin().users.findOne({ id: params.userId });
    if (user?.attributes) {
        delete user.attributes.launch_encounter;
        await getAdmin().users.update({ id: params.userId }, { attributes: user.attributes });
    }
    return { success: true };
}, {
    response: t.Object({
        success: t.Boolean({ description: 'Whether the delete was successful' })
    }),
    detail: {
        summary: 'Remove Encounter Context',
        description: 'Remove the encounter context for a user',
        tags: ['launch-contexts']
    }
});
