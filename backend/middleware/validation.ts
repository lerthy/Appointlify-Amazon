import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import { Request, Response, NextFunction } from 'express';

type Constructor<T = {}> = new (...args: any[]) => T;

/**
 * Validation middleware factory
 * @param dtoClass - The DTO class to validate against
 * @param skipMissingProperties - Whether to skip validation for missing properties (for PATCH updates)
 * @returns Express middleware function
 */
export function validateDto<T extends object>(
  dtoClass: Constructor<T>,
  skipMissingProperties = false
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Transform plain object to class instance
      const dto = plainToInstance(dtoClass, req.body);
      
      // Validate the DTO
      const errors: ValidationError[] = await validate(dto, {
        skipMissingProperties,
        whitelist: true, // Strip properties that don't have decorators
        forbidNonWhitelisted: !skipMissingProperties, // Allow extra properties for PATCH updates
      });

      if (errors.length > 0) {
        // Format validation errors for response
        const formattedErrors = errors.map(error => ({
          property: error.property,
          constraints: error.constraints || {},
          value: error.value
        }));

        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: formattedErrors
        });
      }

      // Replace req.body with validated and transformed DTO
      req.body = dto as any;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        success: false,
        error: 'Validation error occurred'
      });
    }
  };
}

