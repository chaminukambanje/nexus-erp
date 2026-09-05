import { createClient } from "@base44/sdk";
import { appParams } from "@/lib/app-params";
import { EnterpriseDataStore } from "./erpDataEngine";

const { appId, token, functionsVersion, appBaseUrl } = appParams;

// Create raw client
const rawClient = createClient({
  appId,
  token,
  functionsVersion,
  serverUrl: "",
  requiresAuth: false,
  appBaseUrl
});

// Cache for enterprise local fallback stores
const localStores = new Map();

function getOrCreateLocalStore(entityName) {
  if (!localStores.has(entityName)) {
    localStores.set(entityName, new EnterpriseDataStore(entityName));
  }
  return localStores.get(entityName);
}

// Wrap base44.entities with transparent fallback proxy
const entitiesProxy = new Proxy(rawClient.entities || {}, {
  get(target, entityName) {
    const rawEntity = target[entityName];
    const localStore = getOrCreateLocalStore(entityName);

    // If entity is purely an enterprise D365 entity or not in rawClient, use localStore directly
    if (!rawEntity) {
      return localStore;
    }

    // Wrap methods to attempt cloud first, and gracefully fallback to local store
    return {
      async list(...args) {
        try {
          const res = await rawEntity.list(...args);
          if (Array.isArray(res) && res.length > 0) return res;
          // If empty in cloud, check if we have local seed records
          const localItems = await localStore.list(...args);
          return (localItems && localItems.length > 0) ? localItems : (res || []);
        } catch (err) {
          console.warn(`Cloud entity list failed for ${entityName}, falling back to Enterprise Store:`, err);
          return localStore.list(...args);
        }
      },
      async get(id) {
        try {
          return await rawEntity.get(id);
        } catch (err) {
          return localStore.get(id);
        }
      },
      async filter(conditions) {
        try {
          const res = await rawEntity.filter(conditions);
          if (Array.isArray(res) && res.length > 0) return res;
          return localStore.filter(conditions);
        } catch (err) {
          return localStore.filter(conditions);
        }
      },
      async create(data) {
        try {
          return await rawEntity.create(data);
        } catch (err) {
          return localStore.create(data);
        }
      },
      async update(id, data) {
        try {
          return await rawEntity.update(id, data);
        } catch (err) {
          return localStore.update(id, data);
        }
      },
      async delete(id) {
        try {
          return await rawEntity.delete(id);
        } catch (err) {
          return localStore.delete(id);
        }
      }
    };
  }
});

export const base44 = {
  ...rawClient,
  entities: entitiesProxy
};
