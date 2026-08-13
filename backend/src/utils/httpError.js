const REQUEST_SOURCES = ["body", "params", "query", "file"];

function sendInternalError(res, error, context = "Request failed") {
  console.error(context, error);

  if (res.headersSent) return res;

  return res.status(500).json({
    error: "Internal Server Error",
    message: "เกิดข้อผิดพลาดภายในระบบ",
  });
}

function formatValidationDetails(issues) {
  return issues.map((issue) => {
    if (issue.field) return issue;

    const source = REQUEST_SOURCES.includes(issue.path?.[0]) ? issue.path[0] : undefined;
    const path = source ? issue.path.slice(1) : issue.path || [];

    return {
      field: path.length ? path.join(".") : "request",
      ...(source ? { source } : {}),
      message: issue.message,
      code: issue.code,
    };
  });
}

function sendValidationError(res, issues) {
  return res.status(400).json({
    error: "Validation failed",
    message: "Request validation failed",
    details: formatValidationDetails(issues),
  });
}

module.exports = {
  REQUEST_SOURCES,
  sendInternalError,
  formatValidationDetails,
  sendValidationError,
};
