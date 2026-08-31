import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export type EditorialImage = { url: string; alt: string; caption: string; align: 'wide' | 'left' | 'right'; kind: 'photo' | 'infographic' };
export type ContentBlock = { id: string; type: 'text'; markdown: string } | { id: string; type: 'image'; image: EditorialImage } | { id: string; type: 'gallery'; images: EditorialImage[] };

@Entity('knowledge_rubrics')
export class KnowledgeRubric {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 80, unique: true }) slug: string;
  @Column({ length: 140 }) label: string;
  @Column({ type: 'text' }) description: string;
  @Column({ name: 'sort_order', default: 0 }) sortOrder: number;
}

@Entity('knowledge_articles')
@Index(['status', 'deletedAt', 'rubricId'])
export class KnowledgeArticle {
  @PrimaryGeneratedColumn() id: number;
  @Column({ length: 180, unique: true }) slug: string;
  @Column({ length: 240 }) title: string;
  @Column({ type: 'text' }) excerpt: string;
  @Column({ length: 20, default: 'draft' }) status: 'draft' | 'published';
  @Column({ name: 'content_type', length: 30, default: 'ARTICLE' }) contentType: string;
  @Column({ name: 'rubric_id' }) rubricId: number;
  @Column({ name: 'repair_category_id', type: 'int', nullable: true }) repairCategoryId: number | null;
  @Column({ type: 'json' }) tags: string[];
  @Column({ type: 'json' }) keywords: string[];
  @Column({ type: 'json' }) blocks: ContentBlock[];
  @Column({ name: 'hero_image', type: 'json', nullable: true }) heroImage: EditorialImage | null;
  @Column({ name: 'seo_title', length: 240, default: '' }) seoTitle: string;
  @Column({ name: 'seo_description', length: 400, default: '' }) seoDescription: string;
  @Column({ length: 140, default: '' }) author: string;
  @Column({ name: 'calculator_category', type: 'varchar', length: 80, nullable: true }) calculatorCategory: string | null;
  @Column({ name: 'related_articles', type: 'json' }) relatedArticles: number[];
  @Column({ default: false }) featured: boolean;
  @Column({ type: 'int', default: 1 }) version: number;
  @Column({ name: 'published_at', type: 'datetime', nullable: true }) publishedAt: Date | null;
  @Column({ name: 'deleted_at', type: 'datetime', nullable: true }) deletedAt: Date | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
