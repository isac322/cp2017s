#!/usr/bin/env python3
# coding: UTF-8

import json
import sys

SIGNALS = {
    1: 'SIGHUP (Hangup detected on controlling terminal or death of controlling process)',
    2: 'SIGINT (Interrupt from keyboard. CTRL+C)',
    3: 'SIGQUIT (Quit from keyboard)',
    4: 'SIGILL (Illegal Instruction)',
    6: 'SIGABRT\nAbort (It\'s mainly sent by the library because of incorrect user source code.)',
    8: 'SIGFPE (Floating-point exception)',
    9: 'SIGKILL (Kill signal)',
    11: 'SIGSEGV\n'
        'Segmentation fault (Invalid memory reference. It\'s mainly because of wrong reference of pointer or array)',
    13: 'SIGPIPE (Broken pipe: write to pipe with no readers', 14: 'SIGALRM (Timer signal from alarm(2))',
    15: 'SIGTERM (Termination signal)'
}


def compare(output_path: str, answer_path: str, index: int) -> dict:
    with open(output_path, encoding='utf-8') as fp, open(answer_path, encoding='utf-8') as answer:
        whole_user_output = fp.read()

        user_output = tuple(map(str.rstrip, whole_user_output.rstrip().split('\n')))
        answer_output = tuple(map(str.rstrip, answer.read().rstrip().split('\n')))

        if len(user_output) != len(answer_output):
            return {'isMatched': False, 'userOutput': whole_user_output, 'inputIndex': index}

        for user_line, ans_line in zip(user_output, answer_output):
            if user_line != ans_line:
                return {'isMatched': False, 'userOutput': whole_user_output, 'inputIndex': index}

    return {'isMatched': True}


def main():
    output = sys.argv[1]
    answer = sys.argv[2]
    data_index = int(sys.argv[3])
    return_code = int(sys.argv[4])
    error_log = sys.argv[5]

    if return_code is 0:
        result = compare(output, answer, data_index)

        with open(error_log, encoding='UTF-8') as fp:
            log = fp.read()

        if len(log) == 0 or log == '\n':
            log = None

        result['errorLog'] = log

    else:
        with open(error_log, encoding='UTF-8') as fp:
            log = fp.readlines()
            if return_code != 124 and len(log) > 0:
                log = log[:-1]

            if return_code - 128 in SIGNALS:
                log.append('signal : {}\n'.format(SIGNALS[return_code - 128]))

            if len(log) == 0:
                log = None
            else:
                log = str.join('', log)

            result = {'isMatched': False, 'returnCode': return_code, 'errorLog': log, 'inputIndex': data_index}

    with open('output/result.json', 'w', encoding='UTF-8') as fp:
        fp.write(json.dumps(result, ensure_ascii=False))

    if result['isMatched']:
        return 0
    else:
        return 1


if __name__ == '__main__':
    exit(main())
