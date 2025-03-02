# Percepção Musical

Um aplicativo para auxiliar músicos a treinar seu ouvido para reconhecer notas musicais.

## Sobre

Percepção Musical é um aplicativo de treinamento auditivo projetado para ajudar músicos de todos os níveis a melhorar sua capacidade de identificar notas musicais. O aplicativo reproduz uma sequência de notas que o usuário deve repetir, ajudando a desenvolver o ouvido musical.

## Recursos

* Treinamento auditivo para reconhecimento de notas
* Sequências personalizáveis de notas musicais
* Suporte para diferentes instrumentos (atualmente Synth, com mais instrumentos planejados)
* Detecção inteligente de notas musicais usando Web Audio API
* Feedback visual e sonoro
* Filtro de volume para evitar detecções falsas por ruído ambiente
* Visualização do nível de volume em tempo real
* Personalização da sensibilidade do microfone

## Tecnologias

* React Native (usando Expo)
* TypeScript
* Expo Audio API para reprodução de som
* Web Audio API para análise de áudio (na web)
* Pitchy para detecção de frequência e identificação de notas

## Detalhes de Implementação

### Sistema de Reprodução de Áudio

O aplicativo utiliza amostras de áudio MP3 de alta qualidade para reproduzir os sons dos instrumentos. Um sistema de cache eficiente é implementado para carregar e gerenciar os arquivos de áudio.

### Detecção de Notas

Para a detecção de notas, o aplicativo utiliza duas abordagens:

1. **Web**: Usa a Web Audio API com a biblioteca Pitchy para analisar o áudio em tempo real e detectar a frequência fundamental do som, convertendo-a para a nota musical correspondente.

2. **Dispositivos Móveis**: Implementa um sistema simplificado de detecção de frequência em nativo.

### Filtro de Volume

O sistema inclui um filtro inteligente de volume que:
- Ignora sons de baixo volume (ruído de fundo)
- Só detecta notas quando o volume ultrapassa um threshold configurável
- Fornece feedback visual do volume em tempo real
- Permite ao usuário ajustar a sensibilidade conforme seu ambiente

## Como Adicionar Novos Instrumentos

Para adicionar um novo instrumento ao aplicativo:

1. Crie uma pasta para o instrumento em `assets/sounds/[nome-do-instrumento]`
2. Adicione arquivos MP3 das notas nomeados no formato `[nota]-[oitava].mp3` (exemplo: `c-3.mp3`, `e-4.mp3`, etc.)
3. Atualize o código em `constants/Notes.ts` para incluir o novo instrumento
4. Adicione o instrumento à lista de opções em `components/SettingsScreen.tsx`

## Suporte a Plataformas

O aplicativo funciona em:
- Web (funcionalidade completa de detecção de notas)
- iOS e Android (detecção de notas básica)

## Configurações

O aplicativo permite personalizar:
- Número de notas por sequência
- Repetições necessárias para avançar
- Intervalo máximo entre notas (em semitons)
- Número total de sequências
- Instrumento usado
- Sensibilidade do microfone
- Feedback visual

## Contribuição

Contribuições são bem-vindas! Se você deseja adicionar recursos, corrigir bugs ou melhorar a documentação, sinta-se à vontade para abrir um pull request.

## Licença

Este projeto é licenciado sob a licença MIT.
