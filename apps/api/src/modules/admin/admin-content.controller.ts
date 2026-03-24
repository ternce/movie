import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { UserRole } from '@movie-platform/shared';

import { ContentService } from '../content/content.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  CreateContentDto,
  UpdateContentDto,
  ContentDetailDto,
} from '../content/dto';

@ApiTags('admin/content')
@ApiBearerAuth()
@Controller('admin/content')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MODERATOR)
export class AdminContentController {
  constructor(private readonly contentService: ContentService) {}

  /**
   * Get all content for admin (includes all statuses).
   */
  @Get()
  @ApiOperation({ summary: 'List all content (admin)' })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by status (DRAFT, PENDING, PUBLISHED, REJECTED, ARCHIVED)',
  })
  @ApiQuery({ name: 'contentType', required: false, description: 'Filter by content type (SERIES, CLIP, SHORT, TUTORIAL)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by title' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiResponse({ status: 200, description: 'Paginated content list with all statuses' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async findAll(
    @Query('status') status?: string,
    @Query('contentType') contentType?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.contentService.findAllAdmin({
      status,
      contentType,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  /**
   * Get single content by ID (admin view).
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get content by ID (admin)' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content details including DRAFT and videoFiles', type: ContentDetailDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async findById(@Param('id') id: string) {
    return this.contentService.findByIdAdmin(id);
  }

  /**
   * Create new content.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create new content' })
  @ApiResponse({ status: 201, description: 'Content created successfully', type: ContentDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Category not found' })
  async create(@Body() dto: CreateContentDto) {
    return this.contentService.create(dto);
  }

  /**
   * Update existing content.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update content' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content updated successfully', type: ContentDetailDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content or Category not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateContentDto) {
    return this.contentService.update(id, dto);
  }

  /**
   * Soft delete (archive) content.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Archive content (soft delete)' })
  @ApiParam({ name: 'id', description: 'Content ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Content archived successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  @ApiResponse({ status: 404, description: 'Content not found' })
  async delete(@Param('id') id: string) {
    return this.contentService.delete(id);
  }
}
