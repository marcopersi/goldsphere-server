import { getPool } from '../dbConfig';
import { PositionSchema, CommonPaginationSchema } from '@marcopersi/shared';
import IPortfolioService, { ListPortfoliosOptions, PortfolioSummary, PortfolioWithPositions } from '../interfaces/IPortfolioService';

// Lightweight copy of product/custody mapping to avoid circular imports
const fetchProductForPosition = async (productId: string) => {
  const productQuery = `
    SELECT 
      product.id, 
      product.name AS productname, 
      product.productTypeId,
      productType.productTypeName AS producttype, 
      product.metalId,
      metal.id AS metal_id,
      metal.name AS metalname,
      metal.symbol AS metal_symbol,
      product.producerId,
      product.weight AS fineweight, 
      product.weightUnit AS unitofmeasure, 
      product.purity,
      product.price,
      product.currency,
      producer.producerName AS producer,
      issuingCountry.issuingCountryName AS country,
      product.year AS productyear,
      product.description,
      product.imageFilename AS imageurl,
      product.inStock,
      product.minimumOrderQuantity,
      product.createdat,
      product.updatedat
    FROM product 
    JOIN productType ON productType.id = product.productTypeId 
    JOIN metal ON metal.id = product.metalId 
    JOIN producer ON producer.id = product.producerId
    LEFT JOIN issuingCountry ON issuingCountry.id = product.issuingCountryId
    WHERE product.id = $1
  `;
  const result = await getPool().query(productQuery, [productId]);
  if (result.rows.length === 0) {
    throw new Error(`Product not found: ${productId}`);
  }
  const row = result.rows[0];
  
  // Ensure imageUrl is valid or use a placeholder
  let imageUrl = 'https://example.com/images/placeholder.jpg';
  if (row.imageurl) {
    imageUrl = row.imageurl.startsWith('http') ? row.imageurl : `https://example.com/images/${row.imageurl}`;
  }
  
  return {
    id: row.id,
    name: row.productname,
    type: row.producttype,
    productTypeId: row.producttypeid,
    metal: {
      id: row.metal_id,
      name: row.metalname,
      symbol: row.metal_symbol
    },
    metalId: row.metalid,
    producer: row.producer,
    producerId: row.producerid,
    weight: parseFloat(row.fineweight) || 0,
    weightUnit: row.unitofmeasure,
    purity: parseFloat(row.purity) || 0.999,
    price: parseFloat(row.price) || 0,
    currency: row.currency,
    country: row.country || undefined,
    year: row.productyear || undefined,
    description: row.description || '',
    imageUrl: imageUrl,
    inStock: row.instock ?? true,
    minimumOrderQuantity: row.minimumorderquantity || 1,
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
};

const mapRowToPosition = async (row: any) => {
  const product = await fetchProductForPosition(row.productid);
  let custody = null;
  if (row.custodyserviceid) {
    const custodyQuery = `
      SELECT 
        cs.id as custodyServiceId,
        cs.custodyServiceName,
        c.id as custodianId,
        c.custodianName,
        cs.fee,
        cs.paymentFrequency
      FROM custodyService cs
      JOIN custodian c ON cs.custodianId = c.id
      WHERE cs.id = $1
    `;
    const custodyResult = await getPool().query(custodyQuery, [row.custodyserviceid]);
    if (custodyResult.rows.length > 0) {
      const custodyRow = custodyResult.rows[0];
      custody = {
        custodyServiceId: custodyRow.custodyserviceid,
        custodyServiceName: custodyRow.custodyservicename,
        custodianId: custodyRow.custodianid,
        custodianName: custodyRow.custodianname,
        fee: parseFloat(custodyRow.fee) || 0,
        paymentFrequency: custodyRow.paymentfrequency
      };
    }
  }
  const position = {
    id: row.id,
    userId: row.userid,
    productId: row.productid,
    portfolioId: row.portfolioid,
    product: product,
    purchaseDate: row.purchasedate || new Date(),
    purchasePrice: parseFloat(row.purchaseprice) || 0,
    marketPrice: parseFloat(row.marketprice) || 0,
    quantity: parseFloat(row.quantity) || 0,
    custodyServiceId: row.custodyserviceid || undefined,
    custody: custody || undefined,
    status: row.status || 'active',
    notes: row.notes || '',
    createdAt: row.createdat || new Date(),
    updatedAt: row.updatedat || new Date()
  };
  // Validate against shared schema to ensure shape
  return PositionSchema.parse(position);
};

export class PortfolioService implements IPortfolioService {
  async getUserPortfolios(userId: string, opts: ListPortfoliosOptions = {}) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 20));
    const offset = (page - 1) * limit;

    const where: string[] = ['p.ownerid = $1'];
    const params: any[] = [userId];
    let idx = params.length + 1;

    if (typeof opts.isActive === 'boolean') {
      where.push(`COALESCE(p.isactive, true) = $${idx++}`);
      params.push(opts.isActive);
    }
    if (opts.search) {
      where.push(`(p.portfolioname ILIKE $${idx} OR p.description ILIKE $${idx})`);
      params.push(`%${opts.search}%`);
      idx++;
    }

    const baseQuery = `
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE ${where.join(' AND ')}
    `;

    const dataQuery = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      ${baseQuery}
      ORDER BY p.createdat DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const countQuery = `SELECT COUNT(*) as count ${baseQuery}`;

    const [dataResult, countResult] = await Promise.all([
      getPool().query(dataQuery, params),
      getPool().query(countQuery, params)
    ]);

    const total = parseInt(countResult.rows[0]?.count || '0', 10);
    const portfolios: PortfolioSummary[] = dataResult.rows.map((row: any) => ({
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive,
      totalValue: parseFloat(row.total_value) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalGainLoss: parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: parseInt(row.position_count) || 0,
      lastUpdated: row.last_updated,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    }));

    const pagination = CommonPaginationSchema.parse({
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      hasNext: offset + portfolios.length < total,
      hasPrev: page > 1
    });

    return { portfolios, pagination };
  }

  async getPortfolioById(portfolioId: string) {
    const query = `
      SELECT 
        p.id,
        p.portfolioname,
        p.ownerid,
        p.description,
        COALESCE(p.isactive, true) as isactive,
        COALESCE(portfolio_stats.total_value, 0) as total_value,
        COALESCE(portfolio_stats.total_cost, 0) as total_cost,
        COALESCE(portfolio_stats.total_value - portfolio_stats.total_cost, 0) as total_gain_loss,
        CASE 
          WHEN portfolio_stats.total_cost > 0 
          THEN ((portfolio_stats.total_value - portfolio_stats.total_cost) / portfolio_stats.total_cost) * 100
          ELSE 0
        END as total_gain_loss_percentage,
        COALESCE(portfolio_stats.position_count, 0) as position_count,
        GREATEST(p.updatedat, COALESCE(portfolio_stats.last_position_update, p.updatedat)) as last_updated,
        p.createdat,
        p.updatedat
      FROM public.portfolio p
      LEFT JOIN (
        SELECT 
          pos.portfolioid,
          SUM(pos.quantity * COALESCE(pos.marketprice, pos.purchaseprice, 0)) as total_value,
          SUM(pos.quantity * COALESCE(pos.purchaseprice, 0)) as total_cost,
          COUNT(pos.id) as position_count,
          MAX(pos.updatedat) as last_position_update
        FROM public.position pos
        GROUP BY pos.portfolioid
      ) portfolio_stats ON p.id = portfolio_stats.portfolioid
      WHERE p.id = $1
    `;

    const result = await getPool().query(query, [portfolioId]);
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    const summary: PortfolioSummary = {
      id: row.id,
      portfolioName: row.portfolioname,
      ownerId: row.ownerid,
      description: row.description,
      isActive: row.isactive,
      totalValue: parseFloat(row.total_value) || 0,
      totalCost: parseFloat(row.total_cost) || 0,
      totalGainLoss: parseFloat(row.total_gain_loss) || 0,
      totalGainLossPercentage: parseFloat(row.total_gain_loss_percentage) || 0,
      positionCount: parseInt(row.position_count) || 0,
      lastUpdated: row.last_updated,
      createdAt: row.createdat,
      updatedAt: row.updatedat
    };
    return summary;
  }

  async getPortfolioWithPositions(portfolioId: string) {
    const summary = await this.getPortfolioById(portfolioId);
    if (!summary) return null;

    const positionsResult = await getPool().query(
      `SELECT * FROM position WHERE portfolioId = $1 ORDER BY createdat DESC`,
      [portfolioId]
    );
    const positions = await Promise.all(positionsResult.rows.map(mapRowToPosition));
    return { ...summary, positions } as PortfolioWithPositions;
  }
}

export default PortfolioService;
