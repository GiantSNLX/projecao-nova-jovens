# Projeção Nova Jovens 2 — Portal Operacional e Holyrics

Portal operacional, espiritual e de governança para o Ministério de Projeção Nova Jovens 2, pensado para uso em desktop (mesa de projeção) e celular (escala, presença, MDO e versículos), com exportação estruturada para o **Holyrics**.

## Telas e Padrão Oficial do Palco (16:9)

- **Telão Central (Principal):** `3840 × 2160` (4K UHD — 16:9)
- **Lateral Esquerda:** `3200 × 1800` (QHD+ / 3K — 16:9)
- **Lateral Direita:** `3200 × 1800` (QHD+ / 3K — 16:9)

## Módulos Incluídos

1. **Escala da Semana & Check-in na Mesa:** controle das 5 posições oficiais (**Capitão, Principal, Retorno, Corte, Apoio**), confirmação de presença e check-in **"Já estou servindo na mesa"**.
2. **Controle do Culto Ao Vivo:** cronômetro do culto, status das 5 posições da mesa, sequência do roteiro passo a passo e quadro de recados do Capitão.
3. **Ministério de Música (Padrão Holyrics):** importação individual e em lote, formatação automática de estrofes em blocos Widescreen (2 a 4 linhas) e geração de `.txt` pronto para importação.
4. **Ministério de Programação (`Alpha`, `Bravo`, `Charlie`) & Simulador de 3 Telas:** importação de roteiro, validação técnica automática de mídias e **Simulador Multi-Tela sincronizado** (`3200×1800` | `3840×2160` | `3200×1800`) com teste de letra sobreposta, Safe Zone e enquadramento (`Conter`, `Preencher`, `Blur`).
5. **Vida Devocional (MDO & Sábado):** registro semanal de MDO e check-in de versículos no sábado com seleção obrigatória de para quem falou (respeitando privacidade LGPD).
6. **Holyrics & Exportador `.ZIP`:** tabela completa de formatos aceitos pelo Holyrics e gerador automático de pacote `.zip` com pastas separadas por bloco do roteiro, letras `.txt`, `culto_holyrics.json` e script auxiliar.
7. **Governança & Auditoria:** resolução editável dos telões, trava de prazo (*Cutoff*), permissões por papel (RBAC) e log completo de auditoria.

## Rodar localmente (Sem Docker)

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```
