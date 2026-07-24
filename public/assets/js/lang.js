(() => {
    'use strict';

    const COOKIE_NAME = 'rafabru_lang';
    const supported = new Set(['en', 'pt']);
    const cookieMatch = document.cookie.match(new RegExp('(?:^|; )' + COOKIE_NAME + '=([^;]*)'));
    const saved = cookieMatch ? decodeURIComponent(cookieMatch[1]) : 'en';
    const language = supported.has(saved) ? saved : 'en';

    const pt = {
        'File': 'Arquivo',
        'Links': 'Links',
        'Music': 'Música',
        'login': 'entrar',
        'English': 'Inglês',
        'Português': 'Português',
        'Language': 'Idioma',
        'Application menu': 'Menu do aplicativo',
        'Links section': 'Seção de links',
        'nothing is pinned here yet ♡': 'nada foi fixado aqui ainda ♡',
        'Our links will appear here when we choose to make them visible.': 'Nossos links aparecerão aqui quando escolhermos deixá-los visíveis.',
        'music player': 'reprodutor de música',
        'now playing': 'tocando agora',
        'no music available': 'nenhuma música disponível',
        'Background music player': 'Reprodutor de música de fundo',
        'Play music': 'Tocar música',
        'Pause music': 'Pausar música',
        'Next song': 'Próxima música',
        'background music': 'música de fundo',
        'Would you like to play the music for': 'Você gostaria de tocar a música de',
        'play music': 'tocar música',
        'not now': 'agora não',
        'press play to start': 'aperte play para começar',
        'this song could not be played': 'não foi possível tocar esta música',
        'untitled song': 'música sem título',

        'administrator login': 'login de administrador',
        'One small key for editing links, music, and redirects.': 'Uma pequena chave para editar links, músicas e redirecionamentos.',
        'Username': 'Usuário',
        'Password': 'Senha',
        'log in': 'entrar',
        'view site': 'ver site',
        'log out': 'sair',
        'Admin sections': 'Seções administrativas',
        'page settings': 'configurações da página',
        'music': 'música',
        'links': 'links',
        'redirects': 'redirecionamentos',
        'Title': 'Título',
        'Subtitle': 'Subtítulo',
        'Footer before accent': 'Rodapé antes do destaque',
        'Accent text': 'Texto em destaque',
        'Footer after accent': 'Rodapé depois do destaque',
        'Playback order': 'Ordem de reprodução',
        'consecutive playlist': 'playlist em sequência',
        'random songs': 'músicas aleatórias',
        'Starting volume (0–1)': 'Volume inicial (0–1)',
        'music enabled': 'música ativada',
        'show music player': 'mostrar reprodutor de música',
        'save page settings': 'salvar configurações da página',
        'music folder and playlist': 'pasta de músicas e playlist',
        'Upload MP3 files here. Enabled songs play in the order shown, or randomly when random mode is selected. One enabled song loops by itself.': 'Envie arquivos MP3 aqui. As músicas ativadas tocam na ordem exibida ou aleatoriamente quando o modo aleatório estiver selecionado. Uma única música ativada fica em repetição.',
        'Display title (optional)': 'Título de exibição (opcional)',
        'MP3 file': 'Arquivo MP3',
        'include in playback': 'incluir na reprodução',
        'upload song': 'enviar música',
        'No songs have been uploaded. The public player will say “no music available.”': 'Nenhuma música foi enviada. O reprodutor público mostrará “nenhuma música disponível”.',
        'Display title': 'Título de exibição',
        'enabled': 'ativado',
        'save': 'salvar',
        'delete': 'excluir',
        'Move up': 'Mover para cima',
        'Move down': 'Mover para baixo',
        'public buttons': 'botões públicos',
        'Button text': 'Texto do botão',
        'Icon': 'Ícone',
        'Destination': 'Destino',
        'Small description (optional)': 'Descrição curta (opcional)',
        'visible': 'visível',
        'open in new tab': 'abrir em nova aba',
        'new tab': 'nova aba',
        'add button': 'adicionar botão',
        'There are no buttons yet. The public page currently shows its gentle empty-state message.': 'Ainda não há botões. A página pública está mostrando sua mensagem de estado vazio.',
        'Description': 'Descrição',
        'short redirects': 'redirecionamentos curtos',
        'Example: slug': 'Exemplo: o endereço curto',
        'creates': 'cria',
        'Short slug': 'Endereço curto',
        'Redirect type': 'Tipo de redirecionamento',
        '302 — changeable': '302 — alterável',
        '301 — permanent': '301 — permanente',
        'create redirect': 'criar redirecionamento',
        'No redirects have been created.': 'Nenhum redirecionamento foi criado.',

        'The login form expired. Please try again.': 'O formulário de login expirou. Tente novamente.',
        'Welcome back, Serafim.': 'Bem-vindo de volta, Serafim.',
        'The username or password was not accepted.': 'O usuário ou a senha não foram aceitos.',
        'The production password hash has not been configured yet.': 'O hash da senha de produção ainda não foi configurado.',
        'The form expired. Please try again.': 'O formulário expirou. Tente novamente.',
        'Page settings were saved.': 'As configurações da página foram salvas.',
        'A link needs text and a valid http or https address.': 'Um link precisa de texto e de um endereço http ou https válido.',
        'The link was added.': 'O link foi adicionado.',
        'That link no longer exists.': 'Esse link não existe mais.',
        'The link was deleted.': 'O link foi excluído.',
        'The link list was updated.': 'A lista de links foi atualizada.',
        'Use a short slug with lowercase letters, numbers, and hyphens.': 'Use um endereço curto com letras minúsculas, números e hífens.',
        'The redirect destination must be a valid http or https address.': 'O destino do redirecionamento deve ser um endereço http ou https válido.',
        'That redirect slug is already in use.': 'Esse endereço curto já está em uso.',
        'The short redirect was created.': 'O redirecionamento curto foi criado.',
        'That redirect no longer exists.': 'Esse redirecionamento não existe mais.',
        'Check the slug and destination address.': 'Confira o endereço curto e o destino.',
        'The redirect was deleted.': 'O redirecionamento foi excluído.',
        'The redirect was saved.': 'O redirecionamento foi salvo.',
        'Choose an MP3 file to upload.': 'Escolha um arquivo MP3 para enviar.',
        'The song is empty or larger than the configured upload limit.': 'A música está vazia ou ultrapassa o limite de envio configurado.',
        'Only MP3 files are accepted.': 'Somente arquivos MP3 são aceitos.',
        'The uploaded file does not look like an MP3.': 'O arquivo enviado não parece ser um MP3.',
        'The server could not store the uploaded song.': 'O servidor não conseguiu armazenar a música enviada.',
        'The song was uploaded.': 'A música foi enviada.',
        'That song no longer exists.': 'Essa música não existe mais.',
        'The song and its file were deleted.': 'A música e seu arquivo foram excluídos.',
        'The playlist was updated.': 'A playlist foi atualizada.',
        'Unknown administrator action.': 'Ação administrativa desconhecida.',
        'Delete this song and its MP3 file?': 'Excluir esta música e seu arquivo MP3?',
        'Delete this button?': 'Excluir este botão?',
        'Delete this redirect?': 'Excluir este redirecionamento?'
    };

    const dictionary = language === 'pt' ? pt : {};
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';

    const translate = (value) => dictionary[value] || value;

    const skipped = (node) => {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        return Boolean(element?.closest(
            'script, style, input, textarea, [data-i18n-skip], .hero h1, .hero .subtitle, .site-footer, .link-button, .record__title, .record__meta'
        ));
    };

    const translateText = (node) => {
        if (skipped(node)) return;
        const raw = node.nodeValue || '';
        const trimmed = raw.trim();
        if (!trimmed || !dictionary[trimmed]) return;
        node.nodeValue = raw.replace(trimmed, dictionary[trimmed]);
    };

    if (language === 'pt') {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) translateText(node);

        document.querySelectorAll('[aria-label], [title], [placeholder], [onclick]').forEach((element) => {
            ['aria-label', 'title', 'placeholder'].forEach((attribute) => {
                const value = element.getAttribute(attribute);
                if (value && dictionary[value]) element.setAttribute(attribute, dictionary[value]);
            });

            const onclick = element.getAttribute('onclick');
            if (onclick) {
                Object.entries(dictionary).forEach(([english, portuguese]) => {
                    if (onclick.includes(english)) {
                        element.setAttribute('onclick', onclick.replace(english, portuguese));
                    }
                });
            }
        });

        if (dictionary[document.title]) document.title = dictionary[document.title];
    }

    document.querySelectorAll('[data-language-select]').forEach((select) => {
        select.value = language;
        select.addEventListener('change', () => {
            const next = supported.has(select.value) ? select.value : 'en';
            document.cookie = `${COOKIE_NAME}=${encodeURIComponent(next)}; Max-Age=31536000; Path=/; SameSite=Lax`;
            window.location.reload();
        });
    });

    window.rafabruI18n = Object.freeze({ language, t: translate });
})();
