import { ERROR_MESSAGES } from '@common/errors/error-messages';
import { PipeTransform, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

export class ValidateObjectIdPipe implements PipeTransform {
  transform(value: string) {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        ERROR_MESSAGES.GENERAL.INVALID_ID_FORMAT(value),
      );
    }
    return value;
  }
}
