exports.generateRoutes = (router, routes) => routes.forEach(({
  method, route, middleware = (_, __, next) => next(), action,
}) => router[method](route, middleware, action));
