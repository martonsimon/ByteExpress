export enum ErrorCause{
    NONE,
    //timeout
    TIMEOUT,
    //A new request is being sent with the same
    //sequence ID. (if many request is pending
    // and none of them completes)
    BUFFER_ROLLOVER,
    //When the connection is lost or
    //the client/server drops connection
    DISCONNECTED,
    //if the receiver doesn't have the capacity
    //to process the request. (microcontrollers)
    MEMORY_OVERFLOW,
    //An exception occured during the handling
    //of the request
    EXCEPTION,
}