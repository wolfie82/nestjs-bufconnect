import { CustomMetadataStore } from './nestjs-bufconnect.provider';
import { ElizaService } from '../test-utils/mocks/service.test';

describe('CustomMetadataStore', () => {
  let customMetadataStore: CustomMetadataStore;

  beforeEach(() => {
    customMetadataStore = CustomMetadataStore.getInstance();
  });

  it('should return the singleton instance', () => {
    const anotherInstance = CustomMetadataStore.getInstance();
    expect(customMetadataStore).toBe(anotherInstance);
  });

  it('should store and retrieve ServiceType instances', () => {
    const key = 'testKey';
    const serviceType = ElizaService;

    customMetadataStore.set(key, serviceType);
    const retrievedServiceType = customMetadataStore.get(key);

    expect(retrievedServiceType).toBe(serviceType);
  });

  it('should return undefined when getting a non-existent key', () => {
    const nonExistentKey = 'nonExistentKey';
    const retrievedServiceType = customMetadataStore.get(nonExistentKey);

    expect(retrievedServiceType).toBeUndefined();
  });
});
