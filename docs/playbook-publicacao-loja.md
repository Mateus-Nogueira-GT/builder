# Playbook — Como Publicar Sua Loja

Guia completo e passo a passo para criar e publicar sua loja de camisas de time usando o **Construtor de Lojas** integrado ao Wix.

---

## Visao Geral

O Construtor de Lojas e uma plataforma que cria automaticamente sua loja online de camisas de time hospedada no Wix. Ao final do processo, voce tera:

- Um site profissional publicado com seu nome e marca
- Catalogo de produtos ja cadastrado (camisas de time)
- Banners, categorias e selos de confianca configurados
- Painel de gerenciamento no Wix para administrar pedidos e produtos

**Resumo do caminho:**

```
Criar conta na plataforma
       |
Criar conta no Wix
       |
Gerar API Key no Wix
       |
Cadastrar a loja (nome + template)
       |
Fornecer API Key e Site ID
       |
Publicacao automatica
       |
Loja no ar!
```

---

## Pre-requisitos

Antes de comecar, certifique-se de ter:

- [ ] Um email valido
- [ ] Acesso a internet e navegador atualizado (Chrome, Firefox ou Edge)
- [ ] Disposicao para criar uma conta gratuita no Wix

> **Tempo estimado total:** 15 a 20 minutos para completar todas as etapas.

---

## Etapa 1 — Criar Conta na Plataforma

1. Acesse a pagina de login da plataforma (`/login`)
2. Clique em **"Criar conta"** (na parte inferior do formulario)
3. Preencha os campos:
   - **Nome:** Seu nome completo
   - **Email:** Seu melhor email
   - **Senha:** Minimo de 6 caracteres
4. Clique no botao **"Criar Conta"**
5. Voce sera redirecionado automaticamente para a tela de criacao da loja

> **Ja tem conta?** Clique em "Fazer login" e entre com email e senha.

---

## Etapa 2 — Criar Conta no Wix

Se voce ainda nao tem uma conta no Wix, siga estes passos:

1. Acesse **[wix.com](https://www.wix.com)** no navegador
2. Clique em **"Comece Agora"** ou **"Sign Up"**
3. Escolha como criar a conta:
   - **Com email:** Digite seu email e crie uma senha
   - **Com Google:** Clique em "Continue com Google" e selecione sua conta
   - **Com Facebook:** Clique em "Continue com Facebook"
4. Apos criar a conta, voce sera levado ao painel do Wix
5. **Nao e necessario criar um site pelo Wix** — o Construtor de Lojas fara isso automaticamente para voce

> **Ja tem conta no Wix?** Pule para a Etapa 3.

---

## Etapa 3 — Gerar uma API Key no Wix

A API Key e a "chave de acesso" que permite ao Construtor de Lojas gerenciar seu site automaticamente. Siga o passo a passo:

### 3.1 — Acessar a pagina de API Keys

1. Faca login no Wix em **[wix.com](https://www.wix.com)**
2. Acesse diretamente: **[manage.wix.com/account/api-keys](https://manage.wix.com/account/api-keys)**
   - Ou navegue manualmente: Clique no seu avatar (canto superior direito) > **"Configuracoes da Conta"** > **"API Keys"**

### 3.2 — Criar uma nova chave

1. Clique no botao **"Generate API Key"** (ou "Gerar Chave de API")
2. No campo **"Name"**, digite um nome descritivo, por exemplo:
   ```
   Construtor de Lojas
   ```

### 3.3 — Selecionar as permissoes

Marque as seguintes permissoes para que a plataforma funcione corretamente:

| Categoria | Permissao | Por que e necessaria |
|-----------|-----------|---------------------|
| **Wix Stores** | Manage Products | Para cadastrar os produtos na loja |
| **Wix Data (CMS)** | Manage Data Collections | Para criar e preencher o conteudo do site |
| **Site Properties** | Manage Site Properties | Para configurar propriedades do site |
| **Publish** | Publish Site | Para publicar o site automaticamente |

> **Dica:** Na duvida, selecione **todas as permissoes** para garantir que tudo funcione sem problemas. Voce pode ajustar depois.

### 3.4 — Copiar e guardar a chave

1. Clique em **"Generate"** para criar a chave
2. A chave sera exibida na tela — ela comeca com `IST.eyJ...`
3. **IMPORTANTE:** Copie a chave inteira e guarde em um lugar seguro (bloco de notas, email para si mesmo, etc.)
4. A chave so e exibida uma vez. Se perder, sera necessario gerar uma nova

> **Documentacao oficial do Wix sobre API Keys:**
> [dev.wix.com/docs/rest/account-level-apis/api-keys/about-api-keys](https://dev.wix.com/docs/rest/account-level-apis/api-keys/about-api-keys)

---

## Etapa 4 — Escolher o Template da Loja

O Construtor de Lojas oferece templates prontos que servem como base visual para sua loja. Voce escolhera o template durante o cadastro da loja (Etapa 5).

### Templates disponiveis

| Template | Nome | Descricao |
|----------|------|-----------|
| Modelo 01 | Template classico | Layout tradicional de e-commerce com foco em produtos |
| Modelo 02 | Template moderno | Design contemporaneo com destaques visuais |

- Os templates ja vem com a estrutura completa (banners, categorias, selos de confianca)
- Os produtos serao injetados automaticamente apos o provisionamento
- Voce podera personalizar cores, textos e imagens depois pelo painel do Wix

> **Dica:** Visualize os previews na tela de onboarding antes de escolher. Ambos sao profissionais e otimizados para vendas.

---

## Etapa 5 — Cadastrar a Loja na Plataforma

Agora voce vai registrar sua loja no Construtor:

### 5.1 — Iniciar o cadastro

1. Apos o login, voce sera direcionado para a tela de onboarding
   - Se ja estiver logado, va ao **Dashboard** e clique em **"Nova Loja"**

### 5.2 — Passo 1: Nome da Loja

1. Digite o nome da sua loja no campo indicado
   - Exemplo: `Camisa10 Store`, `Fut Manias`, `Loja do Torcedor`
2. Clique em **"Proximo"**

### 5.3 — Passo 2: Selecionar o Template

1. Visualize os previews dos templates disponiveis
2. Clique no template desejado (Modelo 01 ou Modelo 02)
   - Um icone verde de confirmacao aparecera no template selecionado
3. Clique em **"Finalizar Cadastro"**

### 5.4 — Confirmacao

- Voce vera a mensagem: **"Obrigado! Sua loja foi registrada com sucesso."**
- A partir daqui, a equipe finalizara a configuracao (veja proximas etapas)
- O status da sua loja sera **"Pendente"** ate o provisionamento

---

## Etapa 6 — Obter o Site ID (metaSiteId)

O Site ID e o identificador unico do seu site no Wix. Ele e gerado quando o template e duplicado para criar sua loja.

### Como encontrar o Site ID

**Opcao A — Pela URL do Dashboard do Wix:**

1. Acesse **[manage.wix.com](https://manage.wix.com)**
2. Clique no site da sua loja para abrir o dashboard
3. Olhe a URL do navegador — ela tera este formato:
   ```
   https://manage.wix.com/dashboard/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
4. O trecho apos `/dashboard/` e o seu **Site ID**
5. Copie esse ID completo (formato UUID)

**Opcao B — Pelo Wix Dev Center:**

1. Acesse **[dev.wix.com](https://dev.wix.com)**
2. Va em **"My Sites"** ou **"Meus Sites"**
3. Localize o site da sua loja
4. O Site ID estara listado ao lado do nome do site

> **Exemplo de Site ID:** `c208eaf8-8ed3-4ad2-947a-db65813006c2`

---

## Etapa 7 — Fornecer API Key e Site ID

Com a API Key (Etapa 3) e o Site ID (Etapa 6) em maos, voce precisa fornece-los para que o provisionamento aconteca.

### Como enviar os dados

1. Envie ao administrador da plataforma:
   - **API Key** — a chave que comeca com `IST.eyJ...`
   - **Site ID** — o UUID do seu site no Wix
2. O administrador inserira esses dados no painel de provisionamento
3. Ao clicar em **"Injetar Produtos"**, o processo automatico sera iniciado

> **Dica de seguranca:** Envie a API Key por um canal seguro (mensagem direta, email). Nao compartilhe em grupos publicos.

---

## Etapa 8 — Publicacao e Provisionamento

Apos o admin iniciar o provisionamento, o sistema executa automaticamente as seguintes acoes:

### O que acontece nos bastidores

| # | Acao | Descricao |
|---|------|-----------|
| 1 | **Ativacao do CMS** | Habilita o sistema de gerenciamento de conteudo no seu site Wix |
| 2 | **Verificacao pre-flight** | Valida que o site esta pronto para receber conteudo |
| 3 | **Criacao das colecoes** | Cria as estruturas de dados: configuracoes da loja, banners, trust bar, categorias e banner promocional |
| 4 | **Injecao de conteudo** | Preenche banners, cores, logos e textos da loja |
| 5 | **Injecao de produtos** | Cadastra os primeiros 100 produtos. Os demais sao sincronizados em segundo plano |
| 6 | **Publicacao do site** | Publica o site automaticamente para ficar acessivel ao publico |
| 7 | **URL publica** | Gera e salva a URL final da sua loja |

### Apos a publicacao

- O status da loja muda para **"Provisionada"**
- Voce pode acessar o **Painel do Wix** para gerenciar sua loja:
  ```
  https://manage.wix.com/dashboard/{SEU_SITE_ID}
  ```
- A URL publica da sua loja estara disponivel no Dashboard do Construtor

### O que voce pode fazer no painel do Wix

- Gerenciar pedidos e clientes
- Editar produtos (precos, descricoes, imagens)
- Personalizar o design da loja
- Configurar meios de pagamento
- Gerenciar frete e entregas
- Ver relatorios e estatisticas

---

## Checklist Final

Use este checklist para garantir que nada ficou para tras:

- [ ] **Conta na plataforma** — Criada com email e senha
- [ ] **Conta no Wix** — Criada (gratuita ou premium)
- [ ] **API Key do Wix** — Gerada com as permissoes corretas e guardada em local seguro
- [ ] **Loja cadastrada** — Nome definido e template selecionado
- [ ] **Site ID obtido** — Copiado do dashboard do Wix (UUID)
- [ ] **Dados fornecidos** — API Key e Site ID enviados ao admin
- [ ] **Provisionamento concluido** — Produtos injetados e site publicado
- [ ] **Loja no ar** — URL publica acessivel e funcionando

---

## FAQ — Perguntas Frequentes

### "Onde encontro minha API Key?"
Acesse [manage.wix.com/account/api-keys](https://manage.wix.com/account/api-keys). Se voce ja gerou uma chave anteriormente, ela estara listada la. Caso tenha perdido a chave, gere uma nova.

### "Onde encontro o Site ID?"
Na URL do dashboard do Wix. Acesse [manage.wix.com](https://manage.wix.com), abra o site desejado e copie o UUID que aparece apos `/dashboard/` na barra de enderecos.

### "Minha API Key comeca com 'IST.' — esta correto?"
Sim! As API Keys do Wix comecam com `IST.eyJ...`. Certifique-se de copiar a chave completa, incluindo o prefixo.

### "Os produtos nao apareceram na loja"
Os primeiros 100 produtos sao injetados imediatamente. Os demais sao sincronizados em segundo plano e podem levar alguns minutos. Aguarde e atualize a pagina.

### "O site nao foi publicado automaticamente"
Em alguns casos, a publicacao automatica pode falhar. Para publicar manualmente:
1. Acesse o dashboard do Wix: `https://manage.wix.com/dashboard/{SEU_SITE_ID}`
2. Clique em **"Publicar"** no canto superior direito

### "O CMS nao foi ativado"
Verifique se a API Key possui as permissoes de **Wix Data (CMS)** habilitadas. Se necessario, gere uma nova chave com todas as permissoes.

### "Posso ter mais de uma loja?"
Sim! No Dashboard do Construtor, clique em **"Nova Loja"** para criar quantas lojas quiser. Cada loja precisa de sua propria API Key e Site ID.

### "Posso personalizar a loja depois?"
Sim! Apos a publicacao, voce tem acesso total ao painel do Wix para editar design, produtos, pagamentos e tudo mais.

### "Preciso de um plano pago do Wix?"
A conta gratuita do Wix permite criar e publicar o site. Porem, para funcionalidades avancadas (dominio proprio, remover anuncios do Wix, pagamentos online), e recomendado fazer upgrade para um plano pago.

---

## Suporte

Se precisar de ajuda em qualquer etapa, entre em contato com a equipe de suporte da plataforma. Tenha em maos:

- Seu email de cadastro
- O nome da loja
- Capturas de tela de eventuais erros

---

*Ultima atualizacao: Abril 2026*
