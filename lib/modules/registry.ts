import { ModuleManifest } from '@packages/module-sdk/types';

// In a real implementation this might dynamically scan directories
// or use a build-time script to generate the list. For now, we manually
// register available modules here.
const rawModules: Record<string, () => Promise<{ manifest: ModuleManifest }>> = {
    'pm': () => import('@/app/[locale]/(module-pm)/manifest'),
    'traces': () => import('@/app/[locale]/(module-traces)/manifest'),
};

class Registry {
    private manifests: Map<string, ModuleManifest> = new Map();

    async loadAll() {
        for (const [id, loader] of Object.entries(rawModules)) {
            try {
                const { manifest } = await loader();
                this.manifests.set(id, manifest);
            } catch (err) {
                console.error(`Failed to load module manifest for ${id}:`, err);
            }
        }
    }

    getManifest(id: string): ModuleManifest | undefined {
        return this.manifests.get(id);
    }

    getAllManifests(): ModuleManifest[] {
        return Array.from(this.manifests.values());
    }
}

export const ModuleRegistry = new Registry();
