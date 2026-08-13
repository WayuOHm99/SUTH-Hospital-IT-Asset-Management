const {
  REQUEST_SOURCES,
  sendValidationError,
} = require("../utils/httpError");

function getRequestValue(req, source) {
  return source === "file" ? req.file : req[source];
}

function setRequestValue(req, source, value) {
  if (source === "file") {
    req.file = value;
    return;
  }

  try {
    req[source] = value;
  } catch (error) {
    // Express exposes query through a getter in some versions. The fallback
    // below replaces that getter with the validated value for this request.
  }

  if (req[source] !== value) {
    Object.defineProperty(req, source, {
      configurable: true,
      enumerable: true,
      writable: true,
      value,
    });
  }
}

function validateRequest(schemas) {
  return (req, res, next) => {
    const validated = {};
    const details = [];

    for (const source of REQUEST_SOURCES) {
      const schema = schemas && schemas[source];
      if (!schema) continue;

      const requestValue = getRequestValue(req, source);
      const result = schema.safeParse(requestValue || {});
      if (!result.success) {
        details.push(...result.error.issues.map((issue) => ({
          ...issue,
          path: [source, ...issue.path],
        })));
        continue;
      }

      validated[source] = result.data;
    }

    if (details.length > 0) {
      return sendValidationError(res, details);
    }

    for (const [source, value] of Object.entries(validated)) {
      setRequestValue(req, source, value);
    }

    req.validated = {
      ...(req.validated || {}),
      ...validated,
    };

    return next();
  };
}

module.exports = validateRequest;
