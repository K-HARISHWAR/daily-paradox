import type {
  OperationDefinition,
  OperationType,
  ParadoxBehavior,
} from './types.ts';

export const MIN_SAFE_VALUE = -9999;
export const MAX_SAFE_VALUE = 99999;

export const applyStandard = (
  current: number,
  type: OperationType,
  value: number
): number | null => {
  if (type === 'add') {
    const res = current + value;
    return res >= MIN_SAFE_VALUE && res <= MAX_SAFE_VALUE ? res : null;
  }
  if (type === 'subtract') {
    const res = current - value;
    return res >= MIN_SAFE_VALUE && res <= MAX_SAFE_VALUE ? res : null;
  }
  if (type === 'multiply') {
    const res = current * value;
    return res >= MIN_SAFE_VALUE && res <= MAX_SAFE_VALUE ? res : null;
  }
  if (type === 'divide') {
    if (value === 0) return null;
    if (current % value !== 0) return null;
    const res = current / value;
    return res >= MIN_SAFE_VALUE && res <= MAX_SAFE_VALUE ? res : null;
  }
  return null;
};

export const canApplyStandard = (
  current: number,
  type: OperationType,
  value: number
): boolean => {
  return applyStandard(current, type, value) !== null;
};

const resolveParadox = (
  current: number,
  nominalType: OperationType,
  nominalValue: number,
  behavior: ParadoxBehavior
): number | null => {
  if (behavior.kind === 'offset') {
    if (nominalType === 'add') {
      return applyStandard(current, 'add', nominalValue + behavior.delta);
    }
    if (nominalType === 'subtract') {
      return applyStandard(current, 'subtract', nominalValue + behavior.delta);
    }
    if (nominalType === 'multiply') {
      return applyStandard(current, 'multiply', nominalValue + behavior.delta);
    }
    if (nominalType === 'divide') {
      return applyStandard(current, 'divide', nominalValue + behavior.delta);
    }
  }

  if (behavior.kind === 'invert') {
    if (nominalType === 'add') {
      return applyStandard(current, 'subtract', nominalValue);
    }
    if (nominalType === 'subtract') {
      return applyStandard(current, 'add', nominalValue);
    }
    if (nominalType === 'multiply') {
      return applyStandard(current, 'divide', nominalValue);
    }
    if (nominalType === 'divide') {
      return applyStandard(current, 'multiply', nominalValue);
    }
  }

  if (behavior.kind === 'replace') {
    return applyStandard(current, behavior.actualType, behavior.actualValue);
  }

  return null;
};

export const applyOperation = (
  current: number,
  op: OperationDefinition
): number | null => {
  if (op.paradox) {
    return resolveParadox(current, op.type, op.value, op.paradox);
  }
  return applyStandard(current, op.type, op.value);
};

export const canApplyOperation = (
  current: number,
  op: OperationDefinition
): boolean => {
  return applyOperation(current, op) !== null;
};
