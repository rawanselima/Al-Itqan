import { Router, Request, Response } from 'express';
import Settings from '../models/Settings';
import { validate, asyncHandler } from '../middleware';
import { settingsUpdateSchema } from '../schemas';

const router = Router();

// GET settings (returns single settings doc or creates default)
router.get(
  '/',
  asyncHandler(async (_req: Request, res: Response) => {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({
        supervisorName: 'امل طاهر',
      });
    }
    res.json(settings);
  })
);

// PUT update settings
router.put(
  '/',
  validate({ body: settingsUpdateSchema.shape.body }),
  asyncHandler(async (req: Request, res: Response) => {
    const { supervisorName, introText, outroText } = req.body;
    const updateObj: any = {};

    if (supervisorName !== undefined) updateObj.supervisorName = supervisorName;
    if (introText !== undefined) updateObj.introText = introText;
    if (outroText !== undefined) updateObj.outroText = outroText;

    let settings = await Settings.findOneAndUpdate({}, updateObj, {
      new: true,
      upsert: true,
      runValidators: true,
    });

    res.json(settings);
  })
);

export default router;