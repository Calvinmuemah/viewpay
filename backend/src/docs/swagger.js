const swaggerJSDoc = require('swagger-jsdoc');

const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'ViewPay Rewarded Ad Platform REST API',
    version: '1.0.0',
    description: 'API Documentation for ViewPay user mobile app and advertiser dashboard',
  },
  servers: [
    {
      url: 'http://localhost:5000/api/v1',
      description: 'Development server',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};

const options = {
  swaggerDefinition,
  apis: [], // We can specify routes path, but it's simpler to define standard Swagger documentation inline in app.js or routes.
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
