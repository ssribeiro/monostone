import "jasmine";
import "jasmine-expect";

import { app } from './'

describe("index", () => {

  it("should print logs", (done) => {

    expect(app).toBeDefined()
    done()

  });

});
