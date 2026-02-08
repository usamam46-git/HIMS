import { query } from '../config/db.js';

// Get all MR records (with optional search)
export const getAllPatients = async (req, res) => {
    try {
        const { search } = req.query; // search by name, mr, phone, cnic
        let sql = 'SELECT * FROM mr_data WHERE status = 1';
        const params = [];

        if (search) {
            sql += ' AND (mr_number LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR cnic LIKE ?)';
            const term = `%${search}%`;
            params.push(term, term, term, term, term);
        }

        sql += ' ORDER BY id DESC LIMIT 50';
        const results = await query(sql, params);

        const mappedResults = results.map(p => ({
            ...p,
            patient_name: `${p.first_name} ${p.last_name || ''}`.trim(),
            phone_number: p.phone,
            father_husband_name: p.guardian_name
        }));

        res.json({ success: true, count: mappedResults.length, data: mappedResults });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single patient by MR
export const getPatientByMR = async (req, res) => {
    try {
        const { mr } = req.params;
        // Search by MR Number OR ID
        const results = await query('SELECT * FROM mr_data WHERE mr_number = ? OR id = ?', [mr, mr]);

        if (results.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }

        const patient = results[0];

        const history = await query(
            'SELECT * FROM opd_patient_data WHERE patient_mr_number = ? ORDER BY date DESC, time DESC LIMIT 5',
            [patient.mr_number]
        );

        const responseData = {
            ...patient,
            patient_name: `${patient.first_name} ${patient.last_name || ''}`.trim(),
            phone_number: patient.phone,
            father_husband_name: patient.guardian_name,
            history
        };

        res.json({ success: true, data: responseData });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate next MR Number
const generateMRNumber = async () => {
    // Format: MR-YYYY-XXXXX (e.g. MR-2026-00001)
    const year = new Date().getFullYear();
    const prefix = `MR-${year}-`;

    const result = await query(
        'SELECT mr_number FROM mr_data WHERE mr_number LIKE ? ORDER BY id DESC LIMIT 1',
        [`${prefix}%`]
    );

    if (result.length === 0) {
        return `${prefix}00001`;
    }

    const lastMr = result[0].mr_number;
    const parts = lastMr.split('-');
    if (parts.length === 3) {
        const lastSeq = parseInt(parts[2]);
        const nextSeq = lastSeq + 1;
        return `${prefix}${nextSeq.toString().padStart(5, '0')}`;
    }

    return `${prefix}00001`;
};

// Create new patient (MR)
export const createPatient = async (req, res) => {
    try {
        const {
            patient_name, first_name, last_name,
            guardian_name, father_husband_name, guardian_relation,
            cnic, dob, age,
            gender, phone, phone_number,
            address, city, blood_group,
            email, profession,
            mr_number // Manual MR
        } = req.body;

        // Auto-generate MR if not provided (Restoring this logic as we are dropping the buggy trigger)
        let finalMrNumber = mr_number;
        if (!finalMrNumber || finalMrNumber.trim() === '') {
            finalMrNumber = await generateMRNumber();
        } else {
            // Check existence if manual
            const existing = await query('SELECT mr_number FROM mr_data WHERE mr_number = ?', [finalMrNumber]);
            if (existing.length > 0) {
                return res.status(400).json({ success: false, message: 'MR Number already exists' });
            }
        }

        // Parse Name if needed
        let fName = first_name;
        let lName = last_name || '';
        if (!fName && patient_name) {
            const nameParts = patient_name.trim().split(' ');
            fName = nameParts[0];
            lName = nameParts.slice(1).join(' ');
        }

        const phoneVal = phone || phone_number;
        const guardianVal = guardian_name || father_husband_name;

        // Using the new schema fields
        const result = await query(
            `INSERT INTO mr_data 
            (mr_number, first_name, last_name, guardian_name, guardian_relation, 
             cnic, age, gender, phone, email, address, city, blood_group, profession, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                finalMrNumber, fName, lName, guardianVal || null, guardian_relation || 'Parent',
                cnic || null, age || null, gender, phoneVal || null, email || null,
                address || null, city || null, blood_group || null, profession || null, 1
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Patient MR created successfully',
            data: { id: result.insertId, mr_number: finalMrNumber, ...req.body }
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ success: false, message: 'Duplicate entry (CNIC or MR)' });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update patient
export const updatePatient = async (req, res) => {
    try {
        const { mr } = req.params;
        const updates = req.body;

        const dbUpdates = {};

        if (updates.patient_name) {
            const nameParts = updates.patient_name.trim().split(' ');
            dbUpdates.first_name = nameParts[0];
            dbUpdates.last_name = nameParts.slice(1).join(' ');
        }
        if (updates.first_name) dbUpdates.first_name = updates.first_name;
        if (updates.last_name) dbUpdates.last_name = updates.last_name;

        if (updates.father_husband_name) dbUpdates.guardian_name = updates.father_husband_name;
        if (updates.guardian_name) dbUpdates.guardian_name = updates.guardian_name;

        if (updates.phone_number) dbUpdates.phone = updates.phone_number;
        if (updates.phone) dbUpdates.phone = updates.phone;

        if (updates.cnic) dbUpdates.cnic = updates.cnic;
        if (updates.age) dbUpdates.age = updates.age;
        if (updates.gender) dbUpdates.gender = updates.gender;
        if (updates.address) dbUpdates.address = updates.address;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.blood_group) dbUpdates.blood_group = updates.blood_group;
        if (updates.email) dbUpdates.email = updates.email;
        if (updates.profession) dbUpdates.profession = updates.profession;
        if (updates.guardian_relation) dbUpdates.guardian_relation = updates.guardian_relation;

        const fields = Object.keys(dbUpdates);
        if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const values = [...Object.values(dbUpdates), mr];

        const result = await query(
            `UPDATE mr_data SET ${setClause} WHERE mr_number = ?`,
            values
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found' });
        }
        res.json({ success: true, message: 'Patient updated successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
