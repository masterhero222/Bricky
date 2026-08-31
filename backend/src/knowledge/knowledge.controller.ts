import { Body, Controller, Delete, Get, Header, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { KnowledgeAdminGuard } from './knowledge-admin.guard';
import { KnowledgeService } from './knowledge.service';

@Controller('knowledge')
export class KnowledgeController {
  constructor(private readonly knowledge: KnowledgeService) {}
  @Get('metadata') metadata() { return this.knowledge.metadata(); }
  @Get('articles') list(@Query() query: any) { return this.knowledge.list(query); }
  @Get('articles/:slug') article(@Param('slug') slug: string) { return this.knowledge.publicArticle(slug); }
  @Get('sitemap.xml') @Header('Content-Type', 'application/xml; charset=utf-8') sitemap() { return this.knowledge.sitemap(); }
}

@UseGuards(JwtAuthGuard, KnowledgeAdminGuard)
@Controller('admin/knowledge')
export class KnowledgeAdminController {
  constructor(private readonly knowledge: KnowledgeService) {}
  @Get('metadata') metadata() { return this.knowledge.metadata(); }
  @Get('articles') list(@Query() query: any) { return this.knowledge.list(query, true); }
  @Get('articles/:id') article(@Param('id', ParseIntPipe) id: number) { return this.knowledge.adminArticle(id); }
  @Post('articles') create(@Req() req: any, @Body() body: any) { return this.knowledge.save(req.user.id, body); }
  @Put('articles/:id') update(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.knowledge.save(req.user.id, body, id); }
  @Delete('articles/:id') remove(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.knowledge.remove(req.user.id, id, body?.version); }
  @Post('rubrics') createRubric(@Req() req: any, @Body() body: any) { return this.knowledge.saveRubric(req.user.id, body); }
  @Put('rubrics/:id') updateRubric(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() body: any) { return this.knowledge.saveRubric(req.user.id, body, id); }
  @Post('images')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 12 * 1024 * 1024, files: 1, fields: 0 } }))
  upload(@UploadedFile() file?: Express.Multer.File) { return this.knowledge.upload(file); }
}
