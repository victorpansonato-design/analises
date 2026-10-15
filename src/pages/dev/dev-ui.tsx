/**
 * Vitrine dos primitivos do design system (Fase 1, só em desenvolvimento). Serve para conferir o
 * visual híbrido nos dois temas sem montar um caso: troque o tema no menu de preferências.
 */
import { Bell, FileCheck2, Inbox } from "lucide-react";
import { useState } from "react";

import { AnimatedNumber } from "@/components/core/animated-number";
import { Chip } from "@/components/core/chip";
import { DataList } from "@/components/core/data-list";
import { Denominator } from "@/components/core/denominator";
import { EmptyPanel } from "@/components/core/empty-panel";
import { Hint } from "@/components/core/hint";
import { Initials } from "@/components/core/initials";
import { Kbd } from "@/components/core/kbd";
import { MeterBar } from "@/components/core/meter-bar";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { SectionLabel } from "@/components/core/section-label";
import { SegmentedControl } from "@/components/core/segmented-control";
import { StatTile } from "@/components/core/stat-tile";
import { Status } from "@/components/core/status";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { SwitchRow } from "@/components/core/switch-row";
import { Tag } from "@/components/core/tag";
import { Timeline, TimelineItem } from "@/components/core/timeline";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { horas, percent } from "@/lib/format";
import { notificar } from "@/lib/notify";

export default function DevUiPage() {
   const [decisao, setDecisao] = useState<"DISPENSA" | "REGULAR" | "DP" | "ADAP" | null>("DISPENSA");
   const [aba, setAba] = useState<"a" | "b" | "c">("a");
   const [chip, setChip] = useState(true);
   const [sw, setSw] = useState(true);
   const [modal, setModal] = useState(false);
   const [n, setN] = useState(41);

   return (
      <div className="scroll-slim h-full space-y-4 overflow-y-auto rounded-xl bg-workspace pb-8">
         <Surface>
            <SurfaceHeader
               eyebrow="Fase 1"
               title="Primitivos do design system"
               subtitle="Template Anchieta (identidade) + composição e movimento do DS (perfil simples)."
            />
         </Surface>

         <div className="grid gap-4 lg:grid-cols-2">
            <Surface className="space-y-4">
               <SectionLabel>Botões e chips</SectionLabel>
               <div className="flex flex-wrap items-center gap-2">
                  <Button variant="primary" size="md">
                     Concluir análise
                  </Button>
                  <Button>Secundário</Button>
                  <Button variant="ghost">Terciário</Button>
                  <Button variant="danger" size="sm">
                     Encerrar
                  </Button>
                  <Button size="sm" square icon={<Bell aria-hidden />} aria-label="Notificações" />
                  <Button disabled>Desabilitado</Button>
               </div>
               <div className="flex flex-wrap gap-1.5">
                  <Chip active={chip} onClick={() => setChip(v => !v)} count={12}>
                     Com pendência
                  </Chip>
                  <Chip active tone="crit" onClick={() => undefined}>
                     Só atrasados
                  </Chip>
                  <Chip active={false} onClick={() => undefined}>
                     Ouvidoria
                  </Chip>
               </div>
               <SectionLabel>Status e tags</SectionLabel>
               <div className="flex flex-wrap items-center gap-3">
                  <Status tone="ok">Em dia</Status>
                  <Status tone="warn">Atenção</Status>
                  <Status tone="risk">Escalado</Status>
                  <Status tone="crit" solid>
                     Atrasado
                  </Status>
                  <Status tone="info">Pré-análise</Status>
                  <Tag>Transf. externa</Tag>
                  <Tag mono>RA 2312345</Tag>
                  <Initials nome="Juliana Prado" size="sm" />
                  <Kbd>J</Kbd>
               </div>
            </Surface>

            <Surface className="space-y-4">
               <SectionLabel>Segmented e abas</SectionLabel>
               <SegmentedControl
                  options={[
                     { value: "DISPENSA", label: "Dispensa" },
                     { value: "REGULAR", label: "Regular" },
                     { value: "DP", label: "DP" },
                     { value: "ADAP", label: "ADAP" },
                  ]}
                  value={decisao}
                  onChange={setDecisao}
                  layoutId="dev-decisao"
                  ariaLabel="Decisão"
               />
               <SegmentedControl
                  options={[
                     { value: "DISPENSA", label: "Dispensa" },
                     { value: "REGULAR", label: "Regular" },
                  ]}
                  value="DISPENSA"
                  onChange={() => undefined}
                  layoutId="dev-fantasma"
                  ariaLabel="Sugestão"
                  size="xs"
                  fantasma
               />
               <UnderlineTabs
                  tabs={[
                     { value: "a", label: "Análise", count: 9 },
                     { value: "b", label: "Documentos", count: "5/6" },
                     { value: "c", label: "Conversa e histórico" },
                  ]}
                  value={aba}
                  onChange={setAba}
                  layoutId="dev-abas"
                  ariaLabel="Abas de exemplo"
                  idBase="dev"
               />
               <SwitchRow
                  label="Autoriza contato pelo WhatsApp"
                  description="Sem autorização, nada é enviado."
                  checked={sw}
                  onCheckedChange={setSw}
               />
               <Input placeholder="Campo preenchido, sem contorno" />
            </Surface>

            <Surface className="space-y-4">
               <SectionLabel>Números com denominador</SectionLabel>
               <div className="grid grid-cols-2 gap-3">
                  <StatTile
                     label="Casos ativos"
                     value={<AnimatedNumber value={n} />}
                     footer="toque para somar"
                     onClick={() => setN(v => v + 7)}
                     tone="band"
                  />
                  <StatTile label="Atrasados" value={<AnimatedNumber value={6} />} accent="crit" tone="band" />
               </div>
               <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-[12px] text-ink-3">
                     <span>
                        Aproveitamento <Hint label="aproveitamento">CH dispensada ÷ CH total da matriz de destino.</Hint>
                     </span>
                     <span className="font-mono text-ink-2">{percent(1020 / 3200)}</span>
                  </div>
                  <MeterBar value={1020 / 3200} label={`${horas(1020)} de ${horas(3200)}`} />
                  <Denominator numerator={1020} numeratorLabel="h dispensadas" denominator={3200} denominatorLabel="h do curso" />
               </div>
               <DataList
                  columns={2}
                  items={[
                     { label: "Curso", value: "Administração" },
                     { label: "Outro RA", value: null },
                  ]}
               />
            </Surface>

            <Surface className="space-y-4">
               <SectionLabel>Linha do tempo, avisos e vazio</SectionLabel>
               <Timeline>
                  <TimelineItem
                     icon={FileCheck2}
                     title="Documentos completos"
                     stamp="Hoje, 09:12"
                     detail="Pré-análise iniciada automaticamente."
                  />
                  <TimelineItem icon={Bell} tone="brand" title="Proposta enviada" stamp="Hoje, 10:40" />
                  <TimelineItem icon={Bell} tone="crit" title="Prazo estourado" stamp="Hoje, 11:02" />
               </Timeline>
               <Notice tone="warn" title="Pré-análise não concluiu">
                  A grade segue sem sugestões; dá para reexecutar.
               </Notice>
               <div className="flex gap-2">
                  <Button onClick={() => setModal(true)}>Abrir modal</Button>
                  <Button
                     variant="ghost"
                     onClick={() =>
                        notificar({
                           titulo: "Análise concluída",
                           detalhe: "Resumo congelado.",
                           acao: { rotulo: "Abrir próximo caso", onClick: () => undefined },
                        })
                     }
                  >
                     Disparar toast
                  </Button>
               </div>
               <Skeleton className="h-4 w-48" />
               <EmptyPanel compact icon={Inbox} title="Nada na sua vez agora" message="Que tal pegar o próximo da equipe?" />
            </Surface>
         </div>

         <Modal
            open={modal}
            onOpenChange={setModal}
            title="Modal do design system"
            description="Scrim borrado, foco preso, Escape fecha e a saída anima."
            footer={
               <>
                  <Button variant="ghost" onClick={() => setModal(false)}>
                     Voltar
                  </Button>
                  <Button variant="primary" onClick={() => setModal(false)}>
                     Confirmar
                  </Button>
               </>
            }
         >
            <p className="px-5 py-4 text-[13px] text-ink-2">Conteúdo do modal.</p>
         </Modal>
      </div>
   );
}
