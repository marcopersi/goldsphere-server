import { Router, Request, Response } from "express";
import { 
  Metal,
  ProductTypeEnum,
  CountryEnum,
  CurrencyEnum,
  Producer,
  OrderType,
  OrderStatus
} from "@marcopersi/shared";

const router = Router();

/**
 * @swagger
 * /enums/demo:
 *   get:
 *     summary: Demonstrate all enum capabilities from v1.0.9
 *     tags: [Enums Demo]
 *     security: []
 *     responses:
 *       200:
 *         description: Comprehensive enum demonstration
 */
router.get("/demo", async (req: Request, res: Response) => {
  try {
    const enumDemo = {
      metals: {
        all: Metal.values().map(metal => ({
          symbol: metal.symbol,
          name: metal.name,
          toString: metal.toString()
        })),
        goldExample: {
          instance: Metal.GOLD,
          symbol: Metal.GOLD.symbol,
          name: Metal.GOLD.name,
          fromSymbol: Metal.fromSymbol('AU')?.name,
          fromName: Metal.fromName('Gold')?.symbol
        }
      },
      productTypes: {
        all: ProductTypeEnum.values().map(type => ({
          name: type.name,
          toString: type.toString()
        })),
        coinExample: ProductTypeEnum.fromName('Coin')?.name
      },
      countries: {
        all: CountryEnum.values().map(country => ({
          code: country.code,
          name: country.name,
          isoCode2: country.isoCode2,
          toString: country.toString()
        })),
        canadaExample: CountryEnum.fromIsoCode2('CA')
      },
      currencies: {
        all: CurrencyEnum.values().map(currency => ({
          countryCode: currency.countryCode,
          isoCode3: currency.isoCode3,
          isoNumericCode: currency.isoNumericCode,
          toString: currency.toString()
        })),
        chfExample: {
          fromIsoCode3: CurrencyEnum.fromIsoCode3('CHF'),
          fromNumericCode: CurrencyEnum.fromNumericCode(756)
        }
      },
      producers: {
        count: Producer.values().length,
        first3: Producer.values().slice(0, 3).map(producer => ({
          name: producer.name,
          toString: producer.toString()
        })),
        royalCanadianMint: Producer.fromName('Royal Canadian Mint')?.name
      },
      orderTypes: {
        all: OrderType.values().map(type => ({
          value: type.value,
          displayName: type.displayName,
          toString: type.toString()
        })),
        buyExample: {
          value: OrderType.BUY.value,
          displayName: OrderType.BUY.displayName,
          fromValue: OrderType.fromValue('buy')?.displayName
        }
      },
      orderStatuses: {
        all: OrderStatus.values().map(status => ({
          value: status.value,
          displayName: status.displayName,
          description: status.description,
          toString: status.toString()
        })),
        pendingExample: {
          value: OrderStatus.PENDING.value,
          displayName: OrderStatus.PENDING.displayName,
          description: OrderStatus.PENDING.description,
          fromValue: OrderStatus.fromValue('pending')?.displayName
        }
      },
      typeInformation: {
        enumCounts: {
          metals: Metal.values().length,
          productTypes: ProductTypeEnum.values().length,
          countries: CountryEnum.values().length,
          currencies: CurrencyEnum.values().length,
          producers: Producer.values().length,
          orderTypes: OrderType.values().length,
          orderStatuses: OrderStatus.values().length
        },
        sharedPackageVersion: "1.0.9",
        featuresEnabled: [
          "Class-based enums",
          "Type-safe validation",
          "Helper methods (fromValue, values, toString)",
          "Runtime validation with Zod",
          "Backwards compatibility",
          "Immutable enum instances"
        ]
      }
    };

    res.json({
      success: true,
      data: enumDemo,
      message: "Comprehensive enum demonstration from @marcopersi/shared v1.0.9"
    });
  } catch (error) {
    console.error("Error in enum demo:", error);
    res.status(500).json({
      success: false,
      error: "Failed to demonstrate enums",
      details: (error as Error).message
    });
  }
});

export default router;
