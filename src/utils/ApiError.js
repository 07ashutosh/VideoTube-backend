class ApiError extends Error{
    constructor(
        statusCode,                     // HTTP status code (e.g., 400, 404, 500)
        message = "Something went wrong", // Default error message
        errors = [],                     // Array of detailed error messages (if any)
        stack = ""                       // Optional stack trace for debugging
    ){
        super(message)
        this.statusCode = statusCode
        this.data = null 
        this.message = message
        this.sucess = false
        this.errors = errors

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this,this.constructor)
        }
    }
}

export { ApiError }