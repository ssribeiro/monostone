import "jasmine-expect";

import { feature } from './';

describe('Auth Feature', () => {

  it('should be a feature', () => {
    expect(feature).toBeDefined();
  });

  it('should contain models', () => {
    expect(feature.models).toBeArray();
    feature.models.forEach(model => {
      expect(model.name).toBeString();
    });
  });

});
