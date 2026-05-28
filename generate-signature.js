import dotenv from "dotenv";
import crypto from "crypto";

// Load environment variables from .env file
dotenv.config();

const razorpayOrderId = process.argv[2]?.trim().replace(/^['"]|['"]$/g, "");
const razorpayPaymentId = process.argv[3]?.trim().replace(/^['"]|['"]$/g, "");

if (!razorpayOrderId || !razorpayPaymentId) {
    console.log("\n❌ Error: Please provide both razorpayOrderId and razorpayPaymentId.");
    console.log("Usage: node generate-signature.js <razorpayOrderId> <razorpayPaymentId>\n");
    process.exit(1);
}

const secret = process.env.RAZORPAY_KEY_SECRET?.trim();
if (!secret) {
    console.log("\n❌ Error: RAZORPAY_KEY_SECRET is not defined in your .env file.\n");
    process.exit(1);
}

const body = razorpayOrderId + "|" + razorpayPaymentId;
const signature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

console.log("\n==================================================");
console.log("🔑 GENERATED DETAILS FOR POSTMAN / API TESTING");
console.log("==================================================");
console.log(`razorpayOrderId:   "${razorpayOrderId}"`);
console.log(`razorpayPaymentId: "${razorpayPaymentId}"`);
console.log(`razorpaySignature: "${signature}"`);
console.log("==================================================\n");
