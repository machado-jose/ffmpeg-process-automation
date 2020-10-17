// Programa para compressão de vídeos automatizado utilizando o ffmpeg

// Comando para ativar a conversão: node index.js --quality valor_qualidade --input-directory
// path_do_diretorio_entrada --output-directory path_do_diretorio_saida --videos lista_de_videos

const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const EventEmmiter = require('events');

// Palavras-chave que são obrigatórias e únicas
const mandatoryAndUniqueKeywords = [
    '--quality',
    '--input-directory',
    '--output-directory',
    '--format'
]

// Palavras-chave que são obrigatórias, mas existe múltiplas alternativas
const multipleOptionsVideosKeywords = [
    '--videos',
    '--range-videos'
]

// A função checkKeywords verifica se foi informado as palavras-chave e retorna as palavras-chave escolhidas pelo usuário,
// mas que são obrigatórias
function checkKeywords(parameters) {
    let optionsKeywordSelectedByUser = [];

    let hasVideoKeyword = false;

    // Checks if the mandatory keywords were passed
    mandatoryAndUniqueKeywords.forEach((keyword) => {
        if (parameters.find(parameter => parameter == keyword) == undefined) {
            throw new Error(`O parâmetro ${keyword} é obrigatório!`);
        }
    });

    multipleOptionsVideosKeywords.forEach((videoKeywordOption) => {
        if (parameters.find(parameter => parameter == videoKeywordOption)) {
            if (hasVideoKeyword) {
                throw new Error(`A keyword ${optionsKeywordSelectedByUser[0]} foi usada.`);
            } else {
                hasVideoKeyword = true;
                optionsKeywordSelectedByUser.push(videoKeywordOption);
            }
        }
    });

    if (!hasVideoKeyword) throw new Error('Precisa usar --videos ou --range-videos');

    return optionsKeywordSelectedByUser;
}

function getInputDatas(keyword, arguments) {
    let keywordRegex = new RegExp("^--");
    let datas = [];
    let positionKeywordSelected = arguments.indexOf(keyword, 1);

    for (let index = positionKeywordSelected + 1; index < arguments.length; index++) {
        if (keywordRegex.test(arguments[index])) {
            break;
        } else {
            datas.push(arguments[index]);
        }
    }

    if (datas.length == 0) throw new Error(`Precisa informar pelo menos um valor para a keyword ${keyword}`);

    return datas.length > 1 ? datas : datas[0];
}

function getInputDatasFromUser(arguments, optionsKeywordSelectedByUser) {
    let inputDatas = {};

    mandatoryAndUniqueKeywords.forEach((keyword) => {
        inputDatas[keyword] = getInputDatas(keyword, arguments);
    });

    optionsKeywordSelectedByUser.forEach((keyword) => {
        inputDatas[keyword] = getInputDatas(keyword, arguments);
    });

    return inputDatas;
}

function entryCommands() {
    let arguments = [...process.argv];
    let optionsKeywordSelectedByUser = checkKeywords(arguments);
    let inputDatas = getInputDatasFromUser(arguments, optionsKeywordSelectedByUser);
    return {
        'inputDatas': inputDatas,
        'optionsKeywordSelectedByUser': optionsKeywordSelectedByUser
    }
}

function resizeVideosWithFfmpeg(videoPath, quality, outputDirectory, outputVideoName) {
    return new Promise((s, f) => {
        var ffmpeg = spawn('ffmpeg', [
            '-i',
            videoPath,
            '-codec:v',
            'libx264',
            '-profile:v',
            'main',
            '-preset',
            'slow',
            '-b:v',
            '400k',
            '-maxrate',
            '400k',
            '-bufsize',
            '800k',
            '-vf',
            `scale=-2:${quality}`,
            '-threads',
            '0',
            '-b:a',
            '128k',
            `${path.join(outputDirectory, outputVideoName)}`
        ]);
        // Será que é um bug?
        // ffmpeg.stderr não envia os dados de erro, mas do processo em execução. O comando
        // para fazer essa tarefa seria ffmpeg.stdout, mas ela não realiza
        ffmpeg.stderr.on('data', data => {
            console.log(Buffer.from(data).toString());
        });
        ffmpeg.on('close', code => {
            s(code);
        });
    });
}

function resizeVideos(inputDatasInfo) {


    let inputDirectory = path.isAbsolute(inputDatasInfo.inputDatas['--input-directory'])
        ? inputDatasInfo.inputDatas['--input-directory']
        : path.resolve(inputDatasInfo.inputDatas['--input-directory']);

    if (!fs.existsSync(inputDirectory)) throw new Error(`O diretório ${path.basename(inputDirectory)} não existe!`);

    let outputDirectory = path.isAbsolute(inputDatasInfo.inputDatas['--output-directory'])
        ? inputDatasInfo.inputDatas['--output-directory']
        : path.resolve(inputDatasInfo.inputDatas['--output-directory']);

    if (!fs.existsSync(outputDirectory)) {
        fs.mkdir(outputDirectory, { recursive: true }, err => {
            if (err) throw err;
        });
    }

    let qualityValue = Number.parseInt(inputDatasInfo.inputDatas['--quality']);
    if (!qualityValue) throw new Error('O valor informado em --quality não é válido');

    let videoOption = inputDatasInfo.optionsKeywordSelectedByUser[0];
    let formatVideo = inputDatasInfo.inputDatas['--format'];

    listPromises = [];

    if (videoOption === '--range-videos') {
        let namesRange = inputDatasInfo.inputDatas[videoOption];
        if (namesRange.length != 2) throw new Error(`É necessário passar o valor inicial e o valor final no parâmetro ${videoOption}`);
        for (let i = namesRange[0]; i <= namesRange[1]; i++) {
            let filename = `${i}.${formatVideo}`;
            let videoPath = path.join(inputDirectory, filename);
            if (!fs.existsSync(videoPath)) console.warn(`[!] O arquivo ${filename} não existe!`);
            let outputVideoName = `${i}-${qualityValue}.${formatVideo}`;
            listPromises.push(resizeVideosWithFfmpeg(videoPath, qualityValue, outputDirectory, outputVideoName));
        }
    }
    
    return Promise.all(listPromises);
}

class Event extends EventEmmiter { }

const processFFmpegEvent = new Event();

processFFmpegEvent.on('resize', async function () {
    try {
        let inputDatasInfo = entryCommands();
        await resizeVideos(inputDatasInfo);
        console.log("[+] Execução concluída!");
    } catch (error) {
        console.error("Erro durante a execução: " + error);
    }
});

processFFmpegEvent.emit('resize');