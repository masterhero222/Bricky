import { createElement, useRef } from 'react';
import { AlignLeft, AlignRight, ArrowDown, ArrowUp, Bold, Heading2, ImagePlus, Italic, Link2, List, Maximize2, Plus, Trash2, Type } from 'lucide-react';
import { mediaUrl } from '../../utils/mediaUrls';
import { newTextBlock, splitTextWithImage } from './content';

export function ToolButton({ icon: Icon, label, ...props }) {
  return <button type="button" title={label} aria-label={label} {...props}>{createElement(Icon, { size: 17 })}</button>;
}

export function UploadButton({ onUpload, multiple = false, label = 'Качи снимка', disabled = false }) {
  return <label className={`cms-upload-button ${disabled ? 'is-disabled' : ''}`}><ImagePlus size={17} /><span>{label}</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={disabled} onChange={e => { const files = [...e.target.files]; e.target.value = ''; if (files.length) onUpload(files); }} /></label>;
}

export function ImageFields({ image, onChange }) {
  return <div className="cms-image-fields">
    <img src={mediaUrl(image.url)} alt={image.alt || 'Качена снимка'} />
    <div><label>Описание на изображението (alt)<input value={image.alt} maxLength={300} onChange={e => onChange({ ...image, alt: e.target.value })} /></label>
      <label>Надпис под изображението<input value={image.caption} maxLength={600} onChange={e => onChange({ ...image, caption: e.target.value })} /></label>
      <div className="cms-row"><div className="cms-tools" role="group" aria-label="Позиция на изображението">{[[AlignLeft, 'left', 'Вляво'], [Maximize2, 'wide', 'Цяла ширина'], [AlignRight, 'right', 'Вдясно']].map(([icon, value, label]) => <ToolButton key={value} icon={icon} label={label} aria-pressed={image.align === value} onClick={() => onChange({ ...image, align: value })} />)}</div>
        <label>Вид<select value={image.kind} onChange={e => onChange({ ...image, kind: e.target.value })}><option value="photo">Снимка</option><option value="infographic">Инфографика</option></select></label>
      </div>
    </div>
  </div>;
}

function TextEditor({ block, onChange, onImage }) {
  const ref = useRef(null);
  const cursor = useRef(block.markdown.length);
  function format(prefix, suffix = '') {
    const input = ref.current;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    const selected = block.markdown.slice(start, end);
    onChange({ ...block, markdown: block.markdown.slice(0, start) + prefix + selected + suffix + block.markdown.slice(end) });
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + prefix.length, end + prefix.length); });
  }
  return <><div className="cms-tools"><ToolButton icon={Bold} label="Удебелен текст" onClick={() => format('**', '**')} /><ToolButton icon={Italic} label="Курсив" onClick={() => format('*', '*')} /><ToolButton icon={Heading2} label="Подзаглавие" onClick={() => format('\n\n## ')} /><ToolButton icon={List} label="Списък" onClick={() => format('\n- ')} /><ToolButton icon={Link2} label="Връзка" onClick={() => format('[', '](https://)')} /><UploadButton label="Вмъкни снимка" onUpload={files => onImage(files[0], cursor.current)} /></div>
    <textarea ref={ref} aria-label="Текст на блока" value={block.markdown} onSelect={e => { cursor.current = e.target.selectionStart; }} onChange={e => { cursor.current = e.target.selectionStart; onChange({ ...block, markdown: e.target.value }); }} rows={Math.min(18, Math.max(5, block.markdown.split('\n').length))} />
  </>;
}

export default function ContentEditor({ blocks, onChange, upload, busy }) {
  function replace(index, block) { onChange(blocks.map((b, i) => i === index ? block : b)); }
  function move(index, direction) { const next = [...blocks]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next); }
  async function insertImage(index, file, cursor) {
    const images = await upload([file]);
    if (!images) return;
    const old = blocks[index];
    const replacement = splitTextWithImage(old, images[0], cursor);
    onChange([...blocks.slice(0, index), ...replacement, ...blocks.slice(index + 1)]);
  }
  async function addImages(files, gallery = false) {
    const images = await upload(files);
    if (!images) return;
    onChange([...blocks, ...(gallery ? [{ id: crypto.randomUUID(), type: 'gallery', images }] : images.map(image => ({ id: crypto.randomUUID(), type: 'image', image })))]);
  }
  return <section className="cms-blocks"><div className="cms-section-heading"><h2>Съдържание</h2><span>{blocks.length} блока</span></div>
    {blocks.map((block, index) => <section key={block.id} className="cms-block"><header><span>{index + 1}. {block.type === 'text' ? 'Текст' : block.type === 'gallery' ? 'Галерия' : 'Изображение'}</span><div className="cms-tools"><ToolButton icon={ArrowUp} label="Премести блока нагоре" disabled={!index} onClick={() => move(index, -1)} /><ToolButton icon={ArrowDown} label="Премести блока надолу" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} /><ToolButton icon={Plus} label="Добави текст след блока" onClick={() => onChange([...blocks.slice(0, index + 1), newTextBlock(), ...blocks.slice(index + 1)])} /><ToolButton icon={Trash2} label="Премахни блока" onClick={() => { if (window.confirm('Да премахна ли този блок?')) onChange(blocks.filter(b => b.id !== block.id)); }} /></div></header>
      {block.type === 'text' ? <TextEditor block={block} onChange={b => replace(index, b)} onImage={(file, cursor) => insertImage(index, file, cursor)} /> : block.type === 'image' ? <><ImageFields image={block.image} onChange={image => replace(index, { ...block, image })} /><UploadButton label="Замени снимката" onUpload={async files => { const images = await upload(files.slice(0, 1)); if (images) replace(index, { ...block, image: { ...block.image, url: images[0].url } }); }} /></> : <>
        {block.images.map((image, i) => <div className="cms-gallery-item" key={`${image.url}-${i}`}><ImageFields image={image} onChange={value => replace(index, { ...block, images: block.images.map((img, k) => k === i ? value : img) })} /><div className="cms-tools"><ToolButton icon={ArrowUp} label="Снимката напред" disabled={!i} onClick={() => { const images = [...block.images]; [images[i], images[i - 1]] = [images[i - 1], images[i]]; replace(index, { ...block, images }); }} /><ToolButton icon={ArrowDown} label="Снимката назад" disabled={i === block.images.length - 1} onClick={() => { const images = [...block.images]; [images[i], images[i + 1]] = [images[i + 1], images[i]]; replace(index, { ...block, images }); }} /><ToolButton icon={Trash2} label="Премахни снимката" disabled={block.images.length === 1} onClick={() => replace(index, { ...block, images: block.images.filter((_, k) => k !== i) })} /></div></div>)}
        <UploadButton multiple label="Добави в галерията" onUpload={async files => { const images = await upload(files); if (images) replace(index, { ...block, images: [...block.images, ...images] }); }} />
      </>}
    </section>)}
    <div className="cms-add-block"><button type="button" onClick={() => onChange([...blocks, newTextBlock()])}><Type size={17} />Добави текст</button><UploadButton disabled={busy} onUpload={files => addImages(files)} /><UploadButton disabled={busy} multiple label="Добави галерия" onUpload={files => addImages(files, true)} /></div>
  </section>;
}
