const XLSX = require('xlsx');
const Inventory = require('../models/Inventory');
const Recipe = require('../models/Recipe');
const Department = require('../models/Department');

const dataTypes = {
  inventory: {
    model: Inventory,
    fields: ['productCode', 'name', 'category', 'quantity', 'unit', 'price', 'minStock', 'supplier', 'departmentCode'],
    required: ['name', 'quantity', 'unit', 'departmentCode'],
    unique: ['productCode', 'name']
  },
  recipes: {
    model: Recipe,
    fields: ['title', 'sellingPrice', 'isActive', 'departmentCode'],
    required: ['title', 'departmentCode'],
    unique: ['title']
  },
  departments: {
    model: Department,
    fields: ['name', 'code', 'description', 'isActive'],
    required: ['name', 'code'],
    unique: ['name', 'code']
  }
};

exports.downloadTemplate = async (req, res) => {
  try {
    const { type } = req.params;
    const config = dataTypes[type];
    if (!config) return res.status(400).json({ error: 'Invalid data type' });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([config.fields]);
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-template.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.exportData = async (req, res) => {
  try {
    const { type } = req.params;
    const config = dataTypes[type];
    if (!config) return res.status(400).json({ error: 'Invalid data type' });

    let data;
    if (type === 'inventory') {
      data = await config.model.find({}).populate('departmentId', 'name code');
    } else if (type === 'recipes') {
      data = await config.model.find({}).populate('departmentId', 'name code');
    } else {
      data = await config.model.find({});
    }
    
    const rows = [config.fields];
    
    data.forEach(item => {
      const row = config.fields.map(field => {
        if (field === 'departmentCode' && item.departmentId) {
          return item.departmentId.code;
        }
        return item[field] || '';
      });
      rows.push(row);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, type);
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}-export.xlsx`);
    res.send(buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.previewImport = async (req, res) => {
  try {
    const { type } = req.params;
    const config = dataTypes[type];
    if (!config) return res.status(400).json({ error: 'Invalid data type' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const preview = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors = [];
      
      // Check required fields
      config.required.forEach(field => {
        if (!row[field]) errors.push(`${field} is required`);
      });

      // Check department code exists (for inventory and recipes)
      if ((type === 'inventory' || type === 'recipes') && row.departmentCode) {
        const department = await Department.findOne({ code: row.departmentCode });
        if (!department) {
          errors.push(`Department with code '${row.departmentCode}' not found`);
        }
      }

      // Check unique fields
      for (const field of config.unique) {
        if (row[field]) {
          const query = {};
          query[field] = row[field];
          const existing = await config.model.findOne(query);
          if (existing) errors.push(`${field} '${row[field]}' already exists`);
        }
      }

      preview.push({
        rowNumber: i + 2,
        data: row,
        valid: errors.length === 0,
        errors
      });
    }

    res.json({
      totalRows: data.length,
      validRows: preview.filter(r => r.valid).length,
      invalidRows: preview.filter(r => !r.valid).length,
      preview
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.importData = async (req, res) => {
  try {
    const { type } = req.params;
    const { mode } = req.body; // 'skip' or 'all'
    const config = dataTypes[type];
    if (!config) return res.status(400).json({ error: 'Invalid data type' });

    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const wb = XLSX.read(req.file.buffer);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(ws);

    const results = {
      totalRows: data.length,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const errors = [];
      
      // Validate
      config.required.forEach(field => {
        if (!row[field]) errors.push(`${field} is required`);
      });

      // Resolve department code to ID (for inventory and recipes)
      if ((type === 'inventory' || type === 'recipes') && row.departmentCode) {
        const department = await Department.findOne({ code: row.departmentCode });
        if (!department) {
          errors.push(`Department with code '${row.departmentCode}' not found`);
        } else {
          row.departmentId = department._id;
          delete row.departmentCode; // Remove the code field
        }
      }

      if (errors.length > 0) {
        if (mode === 'all') {
          return res.status(400).json({ error: `Validation failed at row ${i + 2}`, details: errors });
        }
        results.errors.push({ row: i + 2, errors });
        results.skipped++;
        continue;
      }

      try {
        // Check if exists (for unique fields)
        let existing = null;
        for (const field of config.unique) {
          if (row[field]) {
            const query = {};
            query[field] = row[field];
            existing = await config.model.findOne(query);
            if (existing) break;
          }
        }

        if (existing) {
          await config.model.findByIdAndUpdate(existing._id, row);
          results.updated++;
        } else {
          await config.model.create(row);
          results.created++;
        }
      } catch (error) {
        if (mode === 'all') {
          return res.status(400).json({ error: `Database error at row ${i + 2}`, details: error.message });
        }
        results.errors.push({ row: i + 2, errors: [error.message] });
        results.skipped++;
      }
    }

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};