import { Router, Request, Response } from 'express';
import { searchHospitals, searchPharmacies, getMedicineInfo } from '../services/publicdata';

const router = Router();

router.get('/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, department } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat, lng 쿼리 파라미터는 필수입니다.' });
      return;
    }

    const hospitals = await searchHospitals(
      Number(lat),
      Number(lng),
      department as string | undefined,
    );

    const mapped = hospitals.map((h) => ({
      id: h.id,
      name: h.name,
      department: h.department,
      address: h.address,
      phone: h.phone,
      operatingHours: '',
      lat: h.lat,
      lng: h.lng,
      distance: h.distance,
      type: h.type,
      doctorCount: h.doctorCount,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Search hospitals error:', err);
    res.status(500).json({ error: '병원 검색 중 오류가 발생했습니다.' });
  }
});

router.get('/pharmacies', async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng } = req.query;

    if (!lat || !lng) {
      res.status(400).json({ error: 'lat, lng 쿼리 파라미터는 필수입니다.' });
      return;
    }

    const pharmacies = await searchPharmacies(Number(lat), Number(lng));

    const mapped = pharmacies.map((p) => ({
      id: p.id,
      name: p.name,
      address: p.address,
      phone: p.phone,
      operatingHours: '',
      lat: p.lat,
      lng: p.lng,
      distance: p.distance,
    }));

    res.json(mapped);
  } catch (err) {
    console.error('Search pharmacies error:', err);
    res.status(500).json({ error: '약국 검색 중 오류가 발생했습니다.' });
  }
});

router.get('/medicine', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      res.status(400).json({ error: '의약품 이름(name) 쿼리 파라미터는 필수입니다.' });
      return;
    }

    const medicine = await getMedicineInfo(name);

    if (!medicine) {
      res.status(404).json({ error: '해당 의약품 정보를 찾을 수 없습니다.' });
      return;
    }

    res.json(medicine);
  } catch (err) {
    console.error('Get medicine info error:', err);
    res.status(500).json({ error: '의약품 정보 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
