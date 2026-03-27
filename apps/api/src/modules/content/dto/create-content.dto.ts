import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsUUID,
  IsOptional,
  IsUrl,
  IsInt,
  IsBoolean,
  IsNumber,
  IsArray,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { ContentType, AgeCategory } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty({
    example: 'My Amazing Series',
    description: 'Content title',
    minLength: 1,
    maxLength: 200,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title!: string;

  @ApiProperty({
    example: 'Description of the content',
    description: 'Full content description',
  })
  @IsString()
  @MinLength(1)
  description!: string;

  @ApiProperty({
    enum: ContentType,
    example: ContentType.SERIES,
    description: 'Type of content',
  })
  @IsEnum(ContentType)
  contentType!: ContentType;

  @ApiPropertyOptional({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'Category ID (required for SERIES, CLIP, TUTORIAL; optional for SHORT)',
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiProperty({
    enum: AgeCategory,
    example: AgeCategory.TWELVE_PLUS,
    description: 'Age restriction category',
  })
  @IsEnum(AgeCategory)
  ageCategory!: AgeCategory;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/thumb.jpg',
    description: 'Thumbnail image URL',
  })
  @IsOptional()
  @IsUrl()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/preview.mp4',
    description: 'Preview video URL',
  })
  @IsOptional()
  @IsUrl()
  previewUrl?: string;

  @ApiPropertyOptional({
    example: 3600,
    description: 'Duration in seconds',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether content is free to access',
  })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({
    example: 299.99,
    description: 'Individual purchase price in RUB',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  individualPrice?: number;

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174001'],
    description: 'Array of tag IDs to associate',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];

  @ApiPropertyOptional({
    example: ['123e4567-e89b-12d3-a456-426614174002'],
    description: 'Array of genre IDs to associate',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  genreIds?: string[];
}
