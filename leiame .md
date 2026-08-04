# Sistema Açaí — Estoque, Vendas (PDV), Financeiro e Clientes

Sistema completo em **HTML + CSS + JavaScript puro**, conectado ao **Supabase**.
Funciona no computador e no celular (o menu vira um botão ☰ em telas pequenas).

## O que o sistema faz

- **PDV (Vender)**: botões de tamanhos de açaí e complementos, cada clique soma no
  pedido; ao finalizar, registra a venda, lança o dinheiro no financeiro e desconta
  o estoque automaticamente (conforme a "ficha técnica" de cada produto).
- **Estoque**: cadastro de materiais (copos, tampas, granola, calda...), com
  quantidade mínima e histórico de entradas/saídas — igual ao print que você mandou.
- **Produtos & preços**: cadastro dos itens vendidos no PDV (açaí 300/500/700ml,
  complementos avulsos) e a "ficha técnica" de cada um (o que ele consome do estoque).
- **Financeiro**: lançamentos manuais de entrada/saída, saldo total e faturamento do mês.
- **Clientes**: nome + WhatsApp opcionais; o sistema sinaliza quem não compra há
  5 dias ou mais e tem um botão que já abre o WhatsApp com uma mensagem pronta.
- **Relatórios**: faturamento por mês, estoque baixo, clientes inativos e um botão
  para gerar tudo isso em **PDF**.
- **Multi-caixa**: no menu lateral tem "Quem está no caixa" — cada atendente escolhe
  o próprio nome antes de vender ou mexer no estoque, assim dá pra usar em vários
  dispositivos ao mesmo tempo e saber quem fez cada coisa.

## Passo a passo para colocar no ar

### 1. Criar o banco de dados (Supabase — gratuito)

1. Crie uma conta em **https://supabase.com** e crie um novo projeto.
2. No painel do projeto, vá em **SQL Editor** → **New query**.
3. Abra o arquivo `schema.sql` (que está junto com estes arquivos), copie tudo e
   cole no editor. Clique em **Run**.
   - Isso cria todas as tabelas e já deixa alguns materiais/produtos de exemplo
     cadastrados (pode editar ou excluir depois, dentro do próprio sistema).

### 2. Conectar o sistema ao seu banco

1. No painel do Supabase, vá em **Project Settings → API**.
2. Copie a **Project URL** e cole no arquivo `config.js`, no lugar de
   `COLE_AQUI_SUA_SUPABASE_URL`.
3. Copie a chave **anon public** e cole no lugar de `COLE_AQUI_SUA_SUPABASE_ANON_KEY`.

### 3. Abrir o sistema

- Mais simples: dê duplo clique no `index.html` para abrir no navegador.
- Para acessar do celular também, hospede a pasta em algum serviço gratuito de
  arquivos estáticos, como **Netlify**, **Vercel** ou **GitHub Pages** (é só
  arrastar a pasta inteira) — aí você acessa pelo link tanto no computador quanto
  no celular, de qualquer lugar.

## Primeiros passos dentro do sistema

1. Vá em **Funcionários** e cadastre quem trabalha no caixa.
2. No menu lateral, escolha "Quem está no caixa".
3. Em **Estoque**, confira/ajuste os materiais de exemplo (copos, granola, etc.)
   ou cadastre os seus.
4. Em **Produtos & preços**, confira os tamanhos de açaí e complementos de
   exemplo, ajuste preços, e clique em **"Ficha técnica"** para dizer o que cada
   um consome do estoque (ex: Açaí 500ml consome 1 Copo 500ml + 1 Tampa).
5. Pronto — já dá pra vender pela aba **PDV**.

## Sobre segurança (importante ler)

Este sistema **não usa login com senha** — o controle de "quem fez o quê" é feito
pela seleção manual de funcionário. Isso deixa o uso simples para vários caixas,
mas significa que qualquer pessoa que tenha a URL e a chave do seu Supabase
(dentro do `config.js`) consegue ler e alterar os dados. Para uso interno de uma
loja pequena isso costuma ser tranquilo, mas:

- Não publique o `config.js` com suas chaves em um repositório público.
- Se no futuro quiser mais segurança (login por usuário e senha, permissões por
  funcionário), dá pra evoluir o sistema para usar o **Supabase Auth** — é só pedir.

## Estrutura dos arquivos

```
index.html    → estrutura das telas
style.css     → visual (cores, layout, responsivo)
app.js        → toda a lógica (vendas, estoque, financeiro, clientes, PDF...)
config.js     → onde você cola a URL e a chave do seu Supabase
schema.sql    → script para criar as tabelas no Supabase
```