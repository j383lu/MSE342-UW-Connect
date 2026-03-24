global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

global.Request = jest.fn();
global.Response = jest.fn();
global.Headers = jest.fn();