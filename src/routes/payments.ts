import { Router } from 'express';
import { PaymentController } from '../controllers/PaymentController';

const router = Router();
const paymentController = new PaymentController();

/**
 * @swagger
 * /api/payments/intent:
 *   post:
 *     summary: Create a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *               - currency
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount in cents
 *                 example: 2000
 *               currency:
 *                 type: string
 *                 description: Currency code
 *                 example: "usd"
 *               customerId:
 *                 type: string
 *                 description: Stripe customer ID
 *                 example: "cus_abc123"
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID
 *                 example: "pm_abc123"
 *               description:
 *                 type: string
 *                 description: Payment description
 *                 example: "Gold purchase"
 *     responses:
 *       200:
 *         description: Payment intent created successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/intent', paymentController.createPaymentIntent.bind(paymentController));

/**
 * @swagger
 * /api/payments/intent/{id}/confirm:
 *   post:
 *     summary: Confirm a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment intent ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentMethodId:
 *                 type: string
 *                 description: Payment method ID
 *                 example: "pm_abc123"
 *     responses:
 *       200:
 *         description: Payment confirmed successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.post('/intent/:id/confirm', paymentController.confirmPayment.bind(paymentController));

/**
 * @swagger
 * /api/payments/intent/{id}:
 *   get:
 *     summary: Retrieve a payment intent
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Payment intent ID
 *     responses:
 *       200:
 *         description: Payment intent retrieved successfully
 *       404:
 *         description: Payment intent not found
 *       500:
 *         description: Internal server error
 */
router.get('/intent/:id', paymentController.retrievePaymentIntent.bind(paymentController));

/**
 * @swagger
 * /api/payments/methods:
 *   get:
 *     summary: List payment methods for a customer
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: customerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Stripe customer ID
 *     responses:
 *       200:
 *         description: Payment methods retrieved successfully
 *       400:
 *         description: Invalid request data
 *       500:
 *         description: Internal server error
 */
router.get('/methods', paymentController.listPaymentMethods.bind(paymentController));

export default router;