import "jasmine";
import { App, createApp } from './app';

describe('App', () => {
  it('should know tecnician', () => {
    let app: App = createApp();
    console.log(app.joel);

    expect(app.joel).toBe('santana');
  });
});
