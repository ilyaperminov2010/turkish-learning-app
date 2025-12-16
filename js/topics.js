/**
 * Topics Module - полный список тем по уровням CEFR (A1-C2)
 * Структура: grammar, vocabulary, phonetics, culture
 */

export const TOPICS = {
    A1: {
        grammar: [
            { id: 'a1_g1', name: 'Простое именное предложение', description: 'Ben öğrenciyim - Я студент' },
            { id: 'a1_g2', name: 'Множественное число (-lar/-ler)', description: 'Гармония гласных в окончаниях' },
            { id: 'a1_g3', name: 'Личные местоимения', description: 'Ben, sen, o, biz, siz, onlar' },
            { id: 'a1_g4', name: 'Указательные местоимения', description: 'Bu, şu, o - этот, тот' },
            { id: 'a1_g5', name: 'Притяжательные суффиксы', description: '-m, -n, -sı, -mız, -nız, -ları' },
            { id: 'a1_g6', name: 'Настоящее время (-yor)', description: 'Yapıyorum - Я делаю' },
            { id: 'a1_g7', name: 'Отрицание в настоящем времени', description: 'Yapmıyorum - Я не делаю' },
            { id: 'a1_g8', name: 'Вопросительная частица mı/mi', description: 'Türk müsün? - Ты турок?' },
            { id: 'a1_g9', name: 'Var/Yok - есть/нет', description: 'Существование и отсутствие' },
            { id: 'a1_g10', name: 'Числительные 1-100', description: 'Bir, iki, üç... yüz' }
        ],
        vocabulary: [
            { id: 'a1_v1', name: 'Приветствия и прощания', description: 'Merhaba, günaydın, hoşça kal' },
            { id: 'a1_v2', name: 'Семья', description: 'Anne, baba, kardeş, aile' },
            { id: 'a1_v3', name: 'Цвета', description: 'Kırmızı, mavi, yeşil, sarı' },
            { id: 'a1_v4', name: 'Дни недели', description: 'Pazartesi, salı, çarşamba...' },
            { id: 'a1_v5', name: 'Месяцы и времена года', description: 'Ocak, şubat... ilkbahar, yaz' },
            { id: 'a1_v6', name: 'Еда и напитки', description: 'Ekmek, su, çay, kahve' },
            { id: 'a1_v7', name: 'Части тела', description: 'Baş, göz, kulak, el, ayak' },
            { id: 'a1_v8', name: 'Одежда', description: 'Gömlek, pantolon, ayakkabı' },
            { id: 'a1_v9', name: 'Дом и комнаты', description: 'Ev, oda, mutfak, banyo' },
            { id: 'a1_v10', name: 'Профессии', description: 'Öğretmen, doktor, mühendis' }
        ],
        phonetics: [
            { id: 'a1_p1', name: 'Турецкий алфавит', description: '29 букв, особые звуки ö, ü, ş, ç, ğ' },
            { id: 'a1_p2', name: 'Гармония гласных (2-way)', description: 'Твёрдые и мягкие гласные' },
            { id: 'a1_p3', name: 'Ударение в словах', description: 'Обычно на последнем слоге' }
        ],
        culture: [
            { id: 'a1_c1', name: 'Турецкое гостеприимство', description: 'Чай, кофе, традиции приёма гостей' },
            { id: 'a1_c2', name: 'Формы обращения', description: 'Bey, hanım, abi, abla' }
        ]
    },

    A2: {
        grammar: [
            { id: 'a2_g1', name: 'Прошедшее время (-dı/-di)', description: 'Yaptım - Я сделал' },
            { id: 'a2_g2', name: 'Будущее время (-acak/-ecek)', description: 'Yapacağım - Я сделаю' },
            { id: 'a2_g3', name: 'Повелительное наклонение', description: 'Yap! Yapın! Yapınız!' },
            { id: 'a2_g4', name: 'Винительный падеж (-ı/-i)', description: 'Kitabı okudum - Я прочитал книгу' },
            { id: 'a2_g5', name: 'Дательный падеж (-a/-e)', description: 'Eve gidiyorum - Иду домой' },
            { id: 'a2_g6', name: 'Местный падеж (-da/-de)', description: 'Evde - дома' },
            { id: 'a2_g7', name: 'Исходный падеж (-dan/-den)', description: 'Evden - из дома' },
            { id: 'a2_g8', name: 'Послелоги', description: 'İçin, ile, gibi, kadar' },
            { id: 'a2_g9', name: 'Сравнительная степень', description: 'Daha büyük - больше' },
            { id: 'a2_g10', name: 'Модальные глаголы', description: '-ebilmek, -meli/-malı' }
        ],
        vocabulary: [
            { id: 'a2_v1', name: 'Путешествия', description: 'Uçak, otel, bilet, pasaport' },
            { id: 'a2_v2', name: 'Покупки', description: 'Mağaza, fiyat, indirim, kasa' },
            { id: 'a2_v3', name: 'Здоровье', description: 'Hastane, ilaç, ağrı, hasta' },
            { id: 'a2_v4', name: 'Погода', description: 'Güneşli, yağmurlu, sıcak, soğuk' },
            { id: 'a2_v5', name: 'Хобби и спорт', description: 'Futbol, yüzme, müzik, kitap' },
            { id: 'a2_v6', name: 'Город и транспорт', description: 'Otobüs, metro, sokak, cadde' },
            { id: 'a2_v7', name: 'Ресторан и кафе', description: 'Menü, hesap, garson, sipariş' },
            { id: 'a2_v8', name: 'Эмоции и чувства', description: 'Mutlu, üzgün, kızgın, şaşkın' }
        ],
        phonetics: [
            { id: 'a2_p1', name: 'Гармония гласных (4-way)', description: 'Выбор суффиксов -ı/-i/-u/-ü' },
            { id: 'a2_p2', name: 'Озвончение согласных', description: 'p→b, t→d, k→ğ, ç→c' },
            { id: 'a2_p3', name: 'Выпадение гласных', description: 'Burun → burnu' }
        ],
        culture: [
            { id: 'a2_c1', name: 'Турецкая кухня', description: 'Kebap, döner, baklava, ayran' },
            { id: 'a2_c2', name: 'Праздники Турции', description: 'Bayram, Cumhuriyet Bayramı' }
        ]
    },

    B1: {
        grammar: [
            { id: 'b1_g1', name: 'Условное наклонение (-sa/-se)', description: 'Если бы... Yapsam' },
            { id: 'b1_g2', name: 'Желательное наклонение', description: 'Keşke yapsaydım - Если бы я сделал' },
            { id: 'b1_g3', name: 'Причастия настоящего времени', description: '-an/-en: gelen adam' },
            { id: 'b1_g4', name: 'Причастия прошедшего времени', description: '-mış/-miş: yapmış olan' },
            { id: 'b1_g5', name: 'Деепричастия', description: '-arak/-erek, -ıp/-ip' },
            { id: 'b1_g6', name: 'Косвенная речь', description: 'Dedi ki... Söyledi ki...' },
            { id: 'b1_g7', name: 'Пассивный залог', description: '-ıl/-il: yapılmak' },
            { id: 'b1_g8', name: 'Каузатив', description: '-dır/-dir: yaptırmak' },
            { id: 'b1_g9', name: 'Взаимный залог', description: '-ış/-iş: görüşmek' },
            { id: 'b1_g10', name: 'Сложные времена', description: '-mıştı, -yordu, -acaktı' }
        ],
        vocabulary: [
            { id: 'b1_v1', name: 'Работа и карьера', description: 'İş, maaş, toplantı, proje' },
            { id: 'b1_v2', name: 'Образование', description: 'Üniversite, sınav, ders, ödev' },
            { id: 'b1_v3', name: 'Технологии', description: 'Bilgisayar, internet, uygulama' },
            { id: 'b1_v4', name: 'Медиа и новости', description: 'Haber, gazete, televizyon' },
            { id: 'b1_v5', name: 'Окружающая среда', description: 'Doğa, çevre, kirlilik, enerji' },
            { id: 'b1_v6', name: 'Отношения', description: 'Arkadaşlık, aşk, evlilik' }
        ],
        phonetics: [
            { id: 'b1_p1', name: 'Интонация в вопросах', description: 'Повышение тона в конце' },
            { id: 'b1_p2', name: 'Связывание слов', description: 'Liaison в турецком' }
        ],
        culture: [
            { id: 'b1_c1', name: 'Турецкая музыка', description: 'Türkü, pop, arabesk' },
            { id: 'b1_c2', name: 'Турецкое кино', description: 'Yeşilçam, современное кино' }
        ]
    },

    B2: {
        grammar: [
            { id: 'b2_g1', name: 'Сложноподчинённые предложения', description: 'Ki, diye, için' },
            { id: 'b2_g2', name: 'Номинализация глаголов', description: '-mak/-mek, -ma/-me, -ış/-iş' },
            { id: 'b2_g3', name: 'Усилительные конструкции', description: 'Bile, dahi, hatta' },
            { id: 'b2_g4', name: 'Уступительные конструкции', description: '-sa da/-se de: yapsa da' },
            { id: 'b2_g5', name: 'Временные придаточные', description: '-dığında, -ınca, -ken' },
            { id: 'b2_g6', name: 'Причинные конструкции', description: '-dığı için, -dan dolayı' },
            { id: 'b2_g7', name: 'Целевые конструкции', description: '-mak için, -sın diye' },
            { id: 'b2_g8', name: 'Результативные конструкции', description: 'O kadar... ki' }
        ],
        vocabulary: [
            { id: 'b2_v1', name: 'Политика и общество', description: 'Hükümet, seçim, demokrasi' },
            { id: 'b2_v2', name: 'Экономика и бизнес', description: 'Ekonomi, yatırım, borsa' },
            { id: 'b2_v3', name: 'Наука и исследования', description: 'Bilim, araştırma, deney' },
            { id: 'b2_v4', name: 'Искусство и литература', description: 'Sanat, edebiyat, şiir, roman' },
            { id: 'b2_v5', name: 'Право и закон', description: 'Hukuk, mahkeme, avukat' },
            { id: 'b2_v6', name: 'Абстрактные понятия', description: 'Özgürlük, adalet, eşitlik' }
        ],
        phonetics: [
            { id: 'b2_p1', name: 'Эмфатическое ударение', description: 'Выделение важных слов' },
            { id: 'b2_p2', name: 'Редукция в разговорной речи', description: 'Gidiyorum → gidiyom' }
        ],
        culture: [
            { id: 'b2_c1', name: 'История Турции', description: 'Османская империя, Ататюрк' },
            { id: 'b2_c2', name: 'Современная Турция', description: 'Политика, экономика, общество' }
        ]
    },

    C1: {
        grammar: [
            { id: 'c1_g1', name: 'Книжный стиль', description: 'Официальный и литературный язык' },
            { id: 'c1_g2', name: 'Архаичные формы', description: 'Устаревшие грамматические формы' },
            { id: 'c1_g3', name: 'Сложные причастные обороты', description: 'Многоуровневые конструкции' },
            { id: 'c1_g4', name: 'Эллипсис', description: 'Опущение элементов предложения' },
            { id: 'c1_g5', name: 'Инверсия', description: 'Изменение порядка слов для акцента' },
            { id: 'c1_g6', name: 'Риторические конструкции', description: 'Вопросы, восклицания' }
        ],
        vocabulary: [
            { id: 'c1_v1', name: 'Академическая лексика', description: 'Научные термины и выражения' },
            { id: 'c1_v2', name: 'Идиомы и пословицы', description: 'Atasözleri ve deyimler' },
            { id: 'c1_v3', name: 'Профессиональный жаргон', description: 'Специализированная лексика' },
            { id: 'c1_v4', name: 'Синонимы и антонимы', description: 'Богатство словарного запаса' }
        ],
        phonetics: [
            { id: 'c1_p1', name: 'Диалекты Турции', description: 'Региональные особенности' },
            { id: 'c1_p2', name: 'Просодия', description: 'Ритм и мелодика речи' }
        ],
        culture: [
            { id: 'c1_c1', name: 'Турецкая литература', description: 'Классики и современники' },
            { id: 'c1_c2', name: 'Философия и мысль', description: 'Турецкие мыслители' }
        ]
    },

    C2: {
        grammar: [
            { id: 'c2_g1', name: 'Стилистические нюансы', description: 'Тонкости выбора форм' },
            { id: 'c2_g2', name: 'Османский турецкий', description: 'Элементы старого языка' },
            { id: 'c2_g3', name: 'Поэтический язык', description: 'Особенности поэзии' },
            { id: 'c2_g4', name: 'Юридический язык', description: 'Официальные документы' }
        ],
        vocabulary: [
            { id: 'c2_v1', name: 'Редкие слова', description: 'Малоупотребительная лексика' },
            { id: 'c2_v2', name: 'Неологизмы', description: 'Новые слова в языке' },
            { id: 'c2_v3', name: 'Арабизмы и персизмы', description: 'Заимствования из арабского и персидского' },
            { id: 'c2_v4', name: 'Сленг и жаргон', description: 'Разговорный молодёжный язык' }
        ],
        phonetics: [
            { id: 'c2_p1', name: 'Акценты и произношение', description: 'Нюансы носителей языка' }
        ],
        culture: [
            { id: 'c2_c1', name: 'Суфизм и мистицизм', description: 'Духовные традиции' },
            { id: 'c2_c2', name: 'Современное искусство', description: 'Авангард и эксперименты' }
        ]
    }
};

/**
 * Получить все темы для уровня
 * @param {string} level - уровень (A1-C2)
 * @returns {Array} - массив тем
 */
export function getTopicsByLevel(level) {
    const levelData = TOPICS[level];
    if (!levelData) return [];
    
    const topics = [];
    for (const category of Object.keys(levelData)) {
        for (const topic of levelData[category]) {
            topics.push({
                ...topic,
                level,
                category
            });
        }
    }
    return topics;
}

/**
 * Получить тему по ID
 * @param {string} topicId - ID темы
 * @returns {object|null} - тема или null
 */
export function getTopicById(topicId) {
    for (const level of Object.keys(TOPICS)) {
        for (const category of Object.keys(TOPICS[level])) {
            const topic = TOPICS[level][category].find(t => t.id === topicId);
            if (topic) {
                return { ...topic, level, category };
            }
        }
    }
    return null;
}

/**
 * Получить все уровни
 * @returns {Array} - массив уровней
 */
export function getLevels() {
    return Object.keys(TOPICS);
}

/**
 * Получить количество тем в уровне
 * @param {string} level - уровень
 * @returns {number} - количество тем
 */
export function getTopicCountByLevel(level) {
    return getTopicsByLevel(level).length;
}

/**
 * Получить иконку для категории
 * @param {string} category - категория
 * @returns {string} - emoji иконка
 */
export function getCategoryIcon(category) {
    const icons = {
        grammar: '📝',
        vocabulary: '📚',
        phonetics: '🔊',
        culture: '🏛️'
    };
    return icons[category] || '📖';
}

/**
 * Получить название категории на русском
 * @param {string} category - категория
 * @returns {string} - название
 */
export function getCategoryName(category) {
    const names = {
        grammar: 'Грамматика',
        vocabulary: 'Лексика',
        phonetics: 'Фонетика',
        culture: 'Культура'
    };
    return names[category] || category;
}

export default TOPICS;
