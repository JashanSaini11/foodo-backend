// ─── WHAT THIS FILE DOES ──────────────────────────────────────
// Configures Swagger/OpenAPI documentation
// All API docs are auto-generated from JSDoc comments in route files
// Accessible at → http://localhost:5000/api/docs

import swaggerJsdoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Foodo API",
            version: "1.0.0",
            description: "Food Delivery App API Documentation",
        },
        servers: [
            {
                url: "http://localhost:5000",
                description: "Development Server",
            },
        ],
        components: {
            securitySchemes: {
                // Since we use httpOnly cookies, we document it as cookieAuth
                cookieAuth: {
                    type: "apiKey",
                    in: "cookie",
                    name: "accessToken",
                },
            },
            schemas: {
                // ─── AUTH SCHEMAS ──────────────────────────────────
                SignupRequest: {
                    type: "object",
                    required: ["name", "email", "password"],
                    properties: {
                        name: { type: "string", example: "John Doe" },
                        email: { type: "string", example: "john@gmail.com" },
                        password: { type: "string", example: "Test@123" },
                        phone: { type: "string", example: "9876543210" },
                    },
                },
                LoginRequest: {
                    type: "object",
                    required: ["email", "password"],
                    properties: {
                        email: { type: "string", example: "john@gmail.com" },
                        password: { type: "string", example: "Test@123" },
                    },
                },
                VerifyOTPRequest: {
                    type: "object",
                    required: ["email", "otp"],
                    properties: {
                        email: { type: "string", example: "john@gmail.com" },
                        otp: { type: "string", example: "123456" },
                    },
                },
                ForgotPasswordRequest: {
                    type: "object",
                    required: ["email"],
                    properties: {
                        email: { type: "string", example: "john@gmail.com" },
                    },
                },
                ResetPasswordRequest: {
                    type: "object",
                    required: ["token", "newPassword"],
                    properties: {
                        token: { type: "string", example: "uuid-reset-token" },
                        newPassword: { type: "string", example: "NewPass@123" },
                    },
                },

                // ─── USER SCHEMAS ──────────────────────────────────
                UpdateProfileRequest: {
                    type: "object",
                    properties: {
                        name: { type: "string", example: "John Updated" },
                        phone: { type: "string", example: "9876543210" },
                    },
                },

                // ─── ADDRESS SCHEMAS ───────────────────────────────
                AddressRequest: {
                    type: "object",
                    required: ["label", "addressLine1", "city", "state", "pincode", "latitude", "longitude"],
                    properties: {
                        label: { type: "string", enum: ["Home", "Work", "Other"], example: "Home" },
                        addressLine1: { type: "string", example: "123 Main Street" },
                        addressLine2: { type: "string", example: "Near Park" },
                        city: { type: "string", example: "Ludhiana" },
                        state: { type: "string", example: "Punjab" },
                        pincode: { type: "string", example: "141001" },
                        latitude: { type: "number", example: 30.9058885 },
                        longitude: { type: "number", example: 75.8359645 },
                    },
                },

                // ─── RESTAURANT SCHEMAS ────────────────────────────
                RestaurantRequest: {
                    type: "object",
                    required: ["name", "cuisineTypes", "address", "location", "deliveryRadius"],
                    properties: {
                        name: { type: "string", example: "Test Restaurant" },
                        description: { type: "string", example: "Best food in town" },
                        cuisineTypes: {
                            type: "array",
                            items: { type: "string" },
                            example: ["North Indian", "Chinese"],
                        },
                        address: {
                            type: "object",
                            properties: {
                                addressLine1: { type: "string", example: "123 Food Street" },
                                city: { type: "string", example: "Ludhiana" },
                                state: { type: "string", example: "Punjab" },
                                pincode: { type: "string", example: "141001" },
                            },
                        },
                        location: {
                            type: "object",
                            properties: {
                                coordinates: {
                                    type: "array",
                                    items: { type: "number" },
                                    example: [75.8359645, 30.9058885],
                                },
                            },
                        },
                        timings: {
                            type: "object",
                            properties: {
                                open: { type: "string", example: "09:00" },
                                close: { type: "string", example: "22:00" },
                                days: {
                                    type: "array",
                                    items: { type: "string" },
                                    example: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                                },
                            },
                        },
                        deliveryRadius: { type: "number", example: 5 },
                        minOrderAmount: { type: "number", example: 100 },
                        deliveryFee: { type: "number", example: 30 },
                        avgDeliveryTime: { type: "number", example: 30 },
                    },
                },

                // ─── MENU SCHEMAS ──────────────────────────────────
                CategoryRequest: {
                    type: "object",
                    required: ["name"],
                    properties: {
                        name: { type: "string", example: "Starters" },
                        description: { type: "string", example: "Delicious starters" },
                        sortOrder: { type: "number", example: 1 },
                    },
                },
                FoodItemRequest: {
                    type: "object",
                    required: ["name", "price", "categoryId", "isVeg"],
                    properties: {
                        name: { type: "string", example: "Paneer Tikka" },
                        description: { type: "string", example: "Grilled cottage cheese" },
                        price: { type: "number", example: 250 },
                        categoryId: { type: "string", example: "6a06e486e2b81fa5fd48e4dd" },
                        isVeg: { type: "boolean", example: true },
                        preparationTime: { type: "number", example: 20 },
                        isBestseller: { type: "boolean", example: false },
                        isSpicy: { type: "boolean", example: false },
                    },
                },

                // ─── CART SCHEMAS ──────────────────────────────────
                AddToCartRequest: {
                    type: "object",
                    required: ["itemId"],
                    properties: {
                        itemId: { type: "string", example: "6a06e486e2b81fa5fd48e4dd" },
                        quantity: { type: "number", example: 2 },
                        customizations: { type: "array", items: {}, example: [] },
                    },
                },
                 UpdateCartRequest: {
                    type: "object",
                    required: ["itemId", "quantity"],
                    properties: {
                        itemId: { type: "string", example: "6a06e486e2b81fa5fd48e4dd" },
                        quantity: { type: "number", example: 3 },
                    },
                },

                // ─── ORDER SCHEMAS ──────────────────────────────────
                PlaceOrderRequest: {
                    type: "object",
                    required: ["addressId", "paymentMethod"],
                    properties: {
                        addressId: { type: "string", example: "6a06e486e2b81fa5fd48e4dd" },
                        paymentMethod: { type: "string", enum: ["COD", "ONLINE"], example: "COD" },
                        specialInstructions: { type: "string", example: "Please keep it spicy" },
                    },
                },
                UpdateOrderStatusRequest: {
                    type: "object",
                    required: ["status", "restaurantId"],
                    properties: {
                        status: { type: "string", enum: ["PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"], example: "PREPARING" },
                        restaurantId: { type: "string", example: "6a06e486e2b81fa5fd48e4dd" },
                    },
                },
                VerifyOrderOTPRequest: {
                    type: "object",
                    required: ["otp"],
                    properties: {
                        otp: { type: "string", example: "123456" },
                    },
                },
                CancelOrderRequest: {
                    type: "object",
                    properties: {
                        reason: { type: "string", example: "Changed my mind" },
                    },
                },

                // ─── RESPONSE SCHEMAS ──────────────────────────────
                SuccessResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: true },
                        message: { type: "string", example: "Operation successful" },
                        data: { type: "object" },
                    },
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean", example: false },
                        message: { type: "string", example: "Something went wrong" },
                        errors: { type: "array", items: {} },
                    },
                },
            },
        },
    },
    // ─── WHERE TO FIND JSDoc COMMENTS ────────────────────────────
    // Swagger scans these files for @swagger comments
    apis: [
        "./src/modules/**/*.js",
    ],
};

export const swaggerSpec = swaggerJsdoc(options);