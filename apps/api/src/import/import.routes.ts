import { Router } from "express";
import { confirmImport, getImportDetail, listImports } from "./import.controller.js";
import { requireAuth, requireKycApproved } from "../middleware/auth.js";

const router = Router();

router.get("/listings", listImports);
router.get("/listings/:externalId", getImportDetail);
router.post("/confirm", requireAuth, requireKycApproved, confirmImport);

export default router;
