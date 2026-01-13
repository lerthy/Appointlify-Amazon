declare module 'serverless-http' {
    import { Application } from 'express';
    import { Handler } from 'aws-lambda';

    function serverless(app: Application, options?: any): Handler;
    export default serverless;
}
