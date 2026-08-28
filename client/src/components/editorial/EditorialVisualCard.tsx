import { useEffect, useMemo, useState } from "react";
import { Download, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createEditorialVisualSvg, editorialVisualFilename, editorialVisualFormats, type EditorialVisualFormat, type EditorialVisualInput } from "@/lib/editorialVisual";

let logoPromise: Promise<string | undefined> | undefined;
function loadBrandLogo() {
  logoPromise ??= fetch("/brand/VARIA%C3%87%C3%83O%203.svg")
    .then(response => response.ok ? response.blob() : Promise.reject(new Error("Logo indisponível")))
    .then(blob => new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    }))
    .catch(() => undefined);
  return logoPromise;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function EditorialVisualCard({ draft }: { draft: EditorialVisualInput }) {
  const [format, setFormat] = useState<EditorialVisualFormat>("feed");
  const [logoDataUrl, setLogoDataUrl] = useState<string>();
  const [exporting, setExporting] = useState(false);
  useEffect(() => { void loadBrandLogo().then(setLogoDataUrl); }, []);
  const svg = useMemo(() => createEditorialVisualSvg({ ...draft, logoDataUrl }, format), [draft, format, logoDataUrl]);
  const previewUrl = useMemo(() => URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" })), [svg]);
  useEffect(() => () => URL.revokeObjectURL(previewUrl), [previewUrl]);

  const exportPng = async () => {
    setExporting(true);
    try {
      const size = editorialVisualFormats[format];
      const image = new Image();
      const sourceUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error("Não foi possível montar a imagem."));
        image.src = sourceUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = size.width;
      canvas.height = size.height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Seu navegador não permite exportar a imagem.");
      context.drawImage(image, 0, 0, size.width, size.height);
      URL.revokeObjectURL(sourceUrl);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Falha ao gerar PNG.")), "image/png", 1));
      downloadBlob(blob, editorialVisualFilename(draft.title, format, "png"));
      toast.success("Imagem PNG pronta para publicação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao exportar a imagem.");
    } finally {
      setExporting(false);
    }
  };

  return <section className="rounded-2xl border border-border/70 bg-muted/20 p-4" aria-label="Arte para redes sociais">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <div><h3 className="flex items-center gap-2 text-sm font-semibold"><ImageIcon className="h-4 w-4 text-primary" />Arte da publicação</h3><p className="mt-1 text-xs text-muted-foreground">Gerada no Virtus com fontes e aviso legal.</p></div>
      <Select value={format} onValueChange={value => setFormat(value as EditorialVisualFormat)}><SelectTrigger className="w-[210px]" aria-label="Formato da arte"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(editorialVisualFormats).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
    </div>
    <div className="mx-auto max-w-[430px] overflow-hidden rounded-xl border border-white/10 bg-black shadow-sm"><img src={previewUrl} alt={`Prévia da arte: ${draft.title}`} className="h-auto w-full" /></div>
    <Button className="mt-3 w-full" variant="outline" disabled={exporting} onClick={() => void exportPng()}><Download className="mr-2 h-4 w-4" />{exporting ? "Gerando…" : "Baixar PNG"}</Button>
  </section>;
}
