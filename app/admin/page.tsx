'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Shield, Upload, Image as ImageIcon } from 'lucide-react';
import { BANNER_COLOR_OPTIONS } from '@/lib/bannerColors';

interface BannerCatalogItem {
    id: string;
    name: string;
    color: string;
    style: string;
    desktopUrl: string;
    mobileUrl: string;
    thumbnailUrl: string;
    primaryColor?: string;
    tags?: string[];
    createdAt: string;
}

export default function AdminPage() {
    const [items, setItems] = useState<BannerCatalogItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [desktop, setDesktop] = useState<File | null>(null);
    const [mobile, setMobile] = useState<File | null>(null);
    const [name, setName] = useState('');
    const [style, setStyle] = useState('');
    const [color, setColor] = useState<string>(BANNER_COLOR_OPTIONS[0]);
    const [primaryColor, setPrimaryColor] = useState('#dc2626');
    const [tags, setTags] = useState('');

    const loadItems = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/banners');
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao carregar banners.');
            }
            setItems(data);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao carregar banners.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadItems();
    }, []);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!desktop || !mobile) {
            toast.error('Envie os arquivos desktop e mobile.');
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', name);
            formData.append('color', color);
            formData.append('style', style);
            formData.append('primaryColor', primaryColor);
            formData.append('tags', tags);
            formData.append('desktop', desktop);
            formData.append('mobile', mobile);

            const response = await fetch('/api/admin/banners', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao cadastrar banner.');
            }

            toast.success('Banner cadastrado com sucesso.');
            setName('');
            setStyle('');
            setColor(BANNER_COLOR_OPTIONS[0]);
            setPrimaryColor('#dc2626');
            setTags('');
            setDesktop(null);
            setMobile(null);
            await loadItems();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro ao cadastrar banner.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 px-4 py-8">
            <div className="mx-auto max-w-6xl space-y-8">
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10">
                        <Shield className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Admin</h1>
                        <p className="text-sm text-zinc-400">
                            Catálogo de banners do hero e futuras funções administrativas
                        </p>
                    </div>
                </div>

                <Card className="border-zinc-800 bg-zinc-900">
                    <CardHeader>
                        <CardTitle className="text-white">Cadastrar banner do cardápio</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Nome do banner"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <Input
                                value={style}
                                onChange={(e) => setStyle(e.target.value)}
                                placeholder="Estilo / coleção"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <Select value={color} onValueChange={setColor}>
                                <SelectTrigger className="border-zinc-700 bg-zinc-800 text-white">
                                    <SelectValue placeholder="Cor do catálogo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {BANNER_COLOR_OPTIONS.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input
                                value={primaryColor}
                                onChange={(e) => setPrimaryColor(e.target.value)}
                                placeholder="#dc2626"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <Input
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                                placeholder="tags separadas por vírgula"
                                className="bg-zinc-800 border-zinc-700 text-white"
                            />
                            <label className="space-y-2 text-sm text-zinc-300">
                                <span>Desktop</span>
                                <Input type="file" accept="image/*" onChange={(e) => setDesktop(e.target.files?.[0] || null)} className="bg-zinc-800 border-zinc-700 text-white" />
                            </label>
                            <label className="space-y-2 text-sm text-zinc-300">
                                <span>Mobile</span>
                                <Input type="file" accept="image/*" onChange={(e) => setMobile(e.target.files?.[0] || null)} className="bg-zinc-800 border-zinc-700 text-white" />
                            </label>
                            <div className="md:col-span-2">
                                <Button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-emerald-500 text-black font-bold hover:bg-emerald-400"
                                >
                                    {saving ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...</>
                                    ) : (
                                        <><Upload className="mr-2 h-4 w-4" /> Cadastrar banner</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {loading ? (
                        <div className="col-span-full flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                        </div>
                    ) : (
                        items.map((item) => (
                            <Card key={item.id} className="border-zinc-800 bg-zinc-900">
                                <CardContent className="p-4 space-y-4">
                                    <div className="aspect-[16/9] overflow-hidden rounded-lg border border-zinc-800">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={item.thumbnailUrl} alt={item.name} className="h-full w-full object-cover" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-white">{item.name}</h3>
                                                <p className="text-sm text-zinc-400">{item.style}</p>
                                            </div>
                                            <Badge className="bg-white/5 text-zinc-300">
                                                <ImageIcon className="mr-1 h-3 w-3" />
                                                Hero
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-emerald-400">{item.color}</p>
                                        {item.tags && item.tags.length > 0 && (
                                            <p className="text-xs text-zinc-500">
                                                {item.tags.join(' • ')}
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
