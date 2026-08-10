class ApiResponse {
  constructor(statusCode, data = null, message = 'Success', meta = undefined) {
    this.statusCode = statusCode;
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    if (meta) this.meta = meta;
  }
}

module.exports = ApiResponse;
