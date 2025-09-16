import { roundDecimal } from '@common/functions/round.function';

const increaseFormula = (unitPrice: number, rate: number) => {
  return parseFloat((unitPrice * (1 + rate / 100)).toFixed(2));
};

const suggestedPriceFormula = (
  unitPrice: number,
  rate: number,
  unitMessure: number,
) => {
  return parseFloat(((unitPrice / unitMessure) * (1 + rate / 100)).toFixed(2));
};

export function calculateIncrease(
  rate: number,
  items: any[],
  hasSuggestedPrice: boolean,
  suggestedPriceRate: number | null,
) {
  let newSubTotal = 0;
  let newTotal = 0;

  for (const item of items) {
    let newItemValue = 0;
    newItemValue = increaseFormula(item.unitPrice, rate);
    item.unitPrice = newItemValue;
    if (hasSuggestedPrice) {
      item.suggestedPrice = suggestedPriceFormula(
        newItemValue,
        suggestedPriceRate,
        item.unitMessure,
      );
    }
    newSubTotal += item.quantity * item.unitPrice;
  }
  newTotal = parseFloat(newSubTotal.toFixed(2));
  return {
    subTotal: newSubTotal,
    totalAmount: newTotal,
    items,
    increasePercentaje: rate,
  };
}

export function calculateDecrease(rate: number, totalAmount: number) {
  const newTotal = roundDecimal(totalAmount * (1 - rate / 100));
  const discountAmount = roundDecimal(totalAmount - newTotal);
  return {
    subTotal: totalAmount,
    totalAmount: newTotal,
    discountAmount,
    discountPercentaje: rate,
  };
}

export function calculateSuggestedPrice(rate: number, items: any[]) {
  for (const item of items) {
    item.suggestedPrice = suggestedPriceFormula(
      item.unitPrice,
      rate,
      item.unitMessure,
    );
  }
  return {
    items,
    suggestedPriceRate: rate,
  };
}
