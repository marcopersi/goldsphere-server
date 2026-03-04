import { CalculationServiceImpl } from '../../src/services/calculation/impl/CalculationServiceImpl';

describe('CalculationServiceImpl', () => {
  it('applies taxes for buy orders', () => {
    const service = new CalculationServiceImpl();
    const result = service.calculateOrderTotal([{ quantity: 1, unitPrice: 100 }], 'buy');

    expect(result.subtotal).toBe(100);
    expect(result.fees.processing).toBe(5);
    expect(result.taxes).toBeCloseTo(8.6625, 4);
    expect(result.totalAmount).toBeCloseTo(113.6625, 4);
  });

  it('does not apply taxes for sell orders', () => {
    const service = new CalculationServiceImpl();
    const result = service.calculateOrderTotal([{ quantity: 1, unitPrice: 100 }], 'sell');

    expect(result.subtotal).toBe(100);
    expect(result.fees.processing).toBe(5);
    expect(result.taxes).toBe(0);
    expect(result.totalAmount).toBe(105);
  });
});
