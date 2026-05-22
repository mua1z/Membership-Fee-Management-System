const { sequelize } = require('../config/db');
const Q = sequelize.QueryTypes.SELECT;

const MEMBER_COUNT_SQL = `
  SELECT su.id AS unitId, mc.id AS catId, COUNT(m.id) AS cnt
  FROM sector_units su
  JOIN sector_unit_categories suc ON suc.sectorUnitId = su.id
  JOIN member_categories mc ON suc.memberCategoryId = mc.id
  LEFT JOIN members m ON m.sectorUnitId = su.id AND m.memberCategoryId = mc.id
  GROUP BY su.id, mc.id
`;

const UNIT_TOTAL_SQL = `
  SELECT su.id AS unitId, COUNT(m.id) AS cnt
  FROM sector_units su
  LEFT JOIN members m ON m.sectorUnitId = su.id
  GROUP BY su.id
`;

function buildTree(sectorTypes, sectorUnits, categories, unitCategories, countMap, totalMap, parentId) {
  const catMap = {};
  for (const c of categories) {
    catMap[c.id] = c.name;
  }

  const ucMap = {};
  for (const uc of unitCategories) {
    if (!ucMap[uc.sectorUnitId]) ucMap[uc.sectorUnitId] = [];
    ucMap[uc.sectorUnitId].push(uc.memberCategoryId);
  }

  // Group units by sectorTypeId
  const typeMap = {};
  const unitMap = {};
  for (const u of sectorUnits) {
    unitMap[u.id] = u;
    if (!typeMap[u.sectorTypeId]) typeMap[u.sectorTypeId] = [];
    typeMap[u.sectorTypeId].push(u.id);
  }

  const tree = sectorTypes.map(st => {
    const unitIds = typeMap[st.id] || [];

    // Build children recursively
    const buildChildren = (parentIdVal) => {
      return unitIds
        .filter(uid => {
          const u = unitMap[uid];
          // If parentId is null, it's a top-level unit (or no hierarchy)
          // If parentId has a value, only include those matching
          if (parentIdVal === undefined) {
            return u.parentId === null || u.parentId === undefined;
          }
          return u.parentId === parentIdVal;
        })
        .map(uid => {
          const u = unitMap[uid];
          const catIds = ucMap[uid] || [];
          const leaves = catIds.map(cid => ({
            id: `${uid}_${cid}`,
            categoryId: cid,
            name: catMap[cid] || 'Unknown',
            count: countMap[`${uid}_${cid}`] || 0
          }));

          // Recursively get sub-units
          const subUnits = buildChildren(uid);

          const children = subUnits.length > 0
            ? [...leaves, ...subUnits]
            : leaves;

          return {
            id: uid,
            name: u.name,
            total: totalMap[uid] || 0,
            children
          };
        });
    };

    const children = buildChildren(undefined);

    return {
      id: st.id,
      name: st.name,
      total: children.reduce((sum, c) => sum + c.total, 0),
      children
    };
  });

  return tree;
}

exports.getOrganization = async (req, res) => {
  try {
    const sectorTypes = await sequelize.query(
      'SELECT id, name FROM sector_types ORDER BY id',
      { type: Q }
    );
    const sectorUnits = await sequelize.query(
      'SELECT id, sectorTypeId, name, parentId FROM sector_units ORDER BY id',
      { type: Q }
    );
    const categories = await sequelize.query(
      'SELECT id, name FROM member_categories ORDER BY id',
      { type: Q }
    );
    const unitCategories = await sequelize.query(
      `SELECT suc.sectorUnitId, suc.memberCategoryId, mc.name AS catName
       FROM sector_unit_categories suc
       JOIN member_categories mc ON suc.memberCategoryId = mc.id
       ORDER BY suc.sectorUnitId, mc.id`,
      { type: Q }
    );

    const memberCounts = await sequelize.query(MEMBER_COUNT_SQL, { type: Q });
    const unitTotals = await sequelize.query(UNIT_TOTAL_SQL, { type: Q });

    const countMap = {};
    for (const row of memberCounts) {
      const key = `${row.unitId}_${row.catId}`;
      countMap[key] = Number(row.cnt) || 0;
    }

    const totalMap = {};
    for (const row of unitTotals) {
      totalMap[row.unitId] = Number(row.cnt) || 0;
    }

    const tree = buildTree(
      sectorTypes, sectorUnits, categories, unitCategories,
      countMap, totalMap
    );

    res.json({ success: true, data: tree });
  } catch (error) {
    console.error('Organization error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
