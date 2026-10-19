import { Router, type IRouter } from "express";
import healthRouter from "./health";
import marketRouter from "./market";
import journeyRouter from "./journey";
import anthropicRouter from "./anthropic";

const router: IRouter = Router();

router.use(healthRouter);
router.use(marketRouter);
router.use(journeyRouter);
router.use(anthropicRouter);

export default router;
