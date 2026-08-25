import DashboardLayout from "@/components/DashboardLayout";
import { PageMetadata } from "@/components/PageMetadata";
import { Link, useRoute } from "wouter";

const updatedAt = "19 de agosto de 2026";
const contactEmail = "contato@virtusinvestimentos.com.br";

const content = {
  privacy: {
    title: "Política de Privacidade",
    description:
      "Como o Virtus trata dados pessoais e protege a sua privacidade.",
    sections: [
      [
        "Controlador e contato",
        "O portal Virtus é atualmente operado por João Francisco Schaun Martins Filho, em Salvador, Bahia, responsável pelo tratamento dos dados pessoais. Após a formalização da pessoa jurídica, esta identificação será atualizada sem redução dos direitos dos titulares. Dúvidas e solicitações sobre privacidade podem ser enviadas para contato@virtusinvestimentos.com.br.",
      ],
      [
        "Dados tratados",
        "Tratamos dados de cadastro e autenticação, como nome, e-mail, identificador da conta e provedor de acesso; preferências do portal; informações inseridas voluntariamente em carteiras, operações, listas e alertas; mensagens de suporte; e registros técnicos necessários à segurança, prevenção de abuso e diagnóstico de falhas. Não solicitamos senha bancária nem credenciais de corretoras.",
      ],
      [
        "Finalidades e bases legais",
        "Usamos os dados para criar e proteger a conta, entregar as ferramentas solicitadas, salvar preferências, responder ao suporte, prevenir fraude, cumprir obrigações legais e melhorar a estabilidade do portal. Conforme o caso, o tratamento se apoia na execução do serviço solicitado, em obrigações legais, no exercício regular de direitos, no legítimo interesse avaliado com respeito às expectativas do titular ou no consentimento, quando exigido.",
      ],
      [
        "Carteira e informações financeiras",
        "Os dados de carteira são fornecidos manualmente ou por arquivo importado pelo próprio usuário e servem somente para organização e acompanhamento informativo. O Virtus não acessa contas bancárias, não movimenta recursos, não executa ordens e não utiliza esses dados para recomendar investimentos de forma individualizada.",
      ],
      [
        "Fornecedores e transferências",
        "Podemos compartilhar apenas os dados necessários com fornecedores que apoiam autenticação, hospedagem, banco de dados, segurança e comunicação, incluindo serviços Google Cloud e Firebase e a infraestrutura de e-mail da KingHost. Alguns fornecedores podem processar dados fora do Brasil, com salvaguardas contratuais e medidas admitidas pela LGPD. Não vendemos nem alugamos dados pessoais.",
      ],
      [
        "Retenção e exclusão",
        "Dados da conta permanecem enquanto ela estiver ativa e pelo período necessário para cumprir as finalidades informadas. Ao solicitar a exclusão pela área Confiança e dados, eliminamos a identidade de acesso e os dados associados à conta, como carteira, alertas, listas e preferências, ressalvados registros cuja manutenção seja necessária para obrigação legal, prevenção de fraude ou exercício de direitos, pelo prazo aplicável.",
      ],
      [
        "Seus direitos",
        "Nos termos da LGPD, você pode pedir confirmação do tratamento, acesso, correção, informação sobre compartilhamento, anonimização, bloqueio ou eliminação quando aplicável, portabilidade conforme regulamentação, revogação do consentimento e revisão de decisões automatizadas. Também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados. Para exercer seus direitos, escreva para contato@virtusinvestimentos.com.br; poderemos solicitar confirmação de identidade para proteger a conta.",
      ],
      [
        "Segurança e incidentes",
        "Adotamos controles técnicos e organizacionais proporcionais ao risco, incluindo autenticação, restrição de acesso, conexão criptografada, registros de segurança e separação lógica entre contas. Nenhum ambiente é isento de riscos. Se ocorrer incidente relevante, adotaremos medidas de contenção e faremos as comunicações exigidas pela legislação.",
      ],
      [
        "Menores de idade e atualizações",
        "O portal é destinado a pessoas com 18 anos ou mais. Esta política pode ser atualizada para refletir mudanças legais, técnicas ou operacionais; alterações relevantes serão informadas no portal ou por outro meio adequado.",
      ],
    ],
  },
  terms: {
    title: "Termos de Uso",
    description:
      "Condições de utilização das informações e ferramentas do Virtus.",
    sections: [
      [
        "Responsável pelo portal",
        "O Virtus é atualmente operado por João Francisco Schaun Martins Filho, em Salvador, Bahia. A identificação será atualizada após a formalização da pessoa jurídica. O canal de contato é contato@virtusinvestimentos.com.br.",
      ],
      [
        "Aceitação e elegibilidade",
        "Ao acessar ou criar uma conta, você declara ter pelo menos 18 anos e concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize as áreas autenticadas do portal.",
      ],
      [
        "Natureza do serviço",
        "O Virtus é um portal gratuito, informativo e educacional nesta fase. Não é instituição financeira, corretora, consultoria ou casa de análise; não intermedeia produtos, não executa ordens, não recebe valores, não garante rentabilidade e não presta recomendação individualizada de investimento.",
      ],
      [
        "Dados de mercado e demonstração",
        "Cotações, indicadores, notícias e catálogos podem vir de terceiros, apresentar atraso, indisponibilidade, caráter demonstrativo ou divergência entre fontes. A origem e a condição do dado são indicadas quando aplicável. Confirme informações relevantes em fontes oficiais antes de decidir.",
      ],
      [
        "Riscos e decisões",
        "Investimentos envolvem riscos, inclusive perda parcial ou total do capital. Simulações, comparações, alertas e resultados de carteira não consideram necessariamente impostos, taxas, eventos corporativos ou a situação pessoal do usuário. Toda decisão é de responsabilidade do usuário e, quando necessário, deve contar com profissional devidamente habilitado.",
      ],
      [
        "Conta e uso permitido",
        "Você é responsável pela segurança dos meios de acesso, pela veracidade dos dados inseridos e pelas atividades realizadas em sua conta. É proibido explorar falhas, contornar controles, automatizar acessos abusivos, transmitir código malicioso, violar direitos de terceiros ou usar o portal para atividade ilegal. Podemos restringir o acesso necessário para proteger usuários e a plataforma.",
      ],
      [
        "Importações e conteúdo do usuário",
        "Você declara possuir autorização para inserir ou importar os dados utilizados no portal. Esses dados continuam pertencendo a você. A importação deve conter somente informações necessárias ao acompanhamento da própria carteira e não deve incluir senhas, documentos pessoais ou dados de terceiros sem base legal.",
      ],
      [
        "Propriedade intelectual",
        "A marca, a interface, os textos próprios e o software do Virtus são protegidos. O uso do portal não transfere direitos de propriedade intelectual. Conteúdos, marcas e dados de terceiros permanecem sujeitos aos direitos e termos de suas respectivas fontes.",
      ],
      [
        "Disponibilidade e responsabilidade",
        "Buscamos manter o portal seguro e disponível, mas podem ocorrer manutenção, falhas de rede, indisponibilidade de fornecedores ou erros. Na extensão permitida pela lei, não respondemos por decisões financeiras, perdas decorrentes de dados de terceiros ou interrupções fora do nosso controle. Esta disposição não exclui responsabilidades que não possam ser afastadas legalmente.",
      ],
      [
        "Encerramento e alterações",
        "Você pode excluir sua conta na área Confiança e dados. Podemos atualizar funcionalidades e estes Termos; mudanças relevantes serão comunicadas por meio adequado. A legislação brasileira rege estes Termos, preservados os direitos do consumidor e o foro legalmente competente.",
      ],
    ],
  },
  cookies: {
    title: "Política de Cookies",
    description:
      "Entenda o armazenamento essencial e as métricas opcionais do Virtus.",
    sections: [
      [
        "O que utilizamos",
        "O Virtus utiliza cookies e tecnologias semelhantes, como armazenamento local do navegador, para manter a sessão, proteger o acesso, lembrar preferências de interface e registrar a sua escolha de privacidade.",
      ],
      [
        "Armazenamento essencial",
        "É necessário para autenticação, segurança, funcionamento da conta e preferências solicitadas. Por ser indispensável à entrega do serviço, não depende de consentimento e não pode ser desativado pelo painel sem prejudicar funções do portal.",
      ],
      [
        "Métricas opcionais",
        "Métricas não essenciais somente podem ser ativadas após a sua autorização. Quando habilitadas, ajudam a compreender uso agregado, desempenho e erros. A recusa não impede o acesso às funções essenciais, e o Virtus não utiliza essa categoria para vender dados pessoais.",
      ],
      [
        "Como alterar a escolha",
        "Você pode revisar ou revogar a escolha a qualquer momento na área Confiança e dados, em Preferências de privacidade. Também pode bloquear cookies pelo navegador, ciente de que isso pode impedir autenticação e preferências essenciais.",
      ],
      [
        "Duração e terceiros",
        "A duração varia conforme a finalidade: itens de sessão expiram com o acesso, enquanto preferências podem permanecer até serem removidas ou substituídas. Serviços de autenticação e infraestrutura podem definir identificadores estritamente necessários conforme suas próprias políticas e nossas configurações.",
      ],
      [
        "Contato",
        "Dúvidas sobre esta política ou sobre o uso dessas tecnologias podem ser enviadas para contato@virtusinvestimentos.com.br.",
      ],
    ],
  },
} as const;

export default function Legal() {
  const [, params] = useRoute("/:document");
  const key = params?.document as keyof typeof content;
  const page = content[key] ?? content.privacy;

  return (
    <DashboardLayout allowAnonymous>
      <PageMetadata title={page.title} description={page.description} />
      <article className="mx-auto max-w-3xl py-6 sm:py-10">
        <p className="text-sm font-medium text-primary">
          Virtus • Transparência
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Em vigor desde {updatedAt}.
        </p>
        <div className="mt-8 space-y-8">
          {page.sections.map(([heading, body]) => (
            <section key={heading}>
              <h2 className="text-xl font-semibold">{heading}</h2>
              <p className="mt-2 leading-7 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 rounded-2xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Precisa falar com o Virtus?{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {contactEmail}
          </a>
        </p>
        <nav
          aria-label="Documentos legais"
          className="mt-10 flex flex-wrap gap-4 border-t pt-6 text-sm"
        >
          <Link href="/privacy" className="underline underline-offset-4">
            Privacidade
          </Link>
          <Link href="/terms" className="underline underline-offset-4">
            Termos de uso
          </Link>
          <Link href="/cookies" className="underline underline-offset-4">
            Cookies
          </Link>
          <Link href="/trust" className="underline underline-offset-4">
            Confiança e dados
          </Link>
        </nav>
      </article>
    </DashboardLayout>
  );
}
