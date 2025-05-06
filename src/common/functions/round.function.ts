const roundDecimal = (value: number): number => {
  const factor = Math.pow(10, 2);
  return Math.round(value * factor) / factor;
};

export { roundDecimal };
