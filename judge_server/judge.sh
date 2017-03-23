#!/usr/bin/env bash

name=`jq -r .sourceName ./source/config.json`
extension=`jq -r .extension ./source/config.json`
inputNum=`jq -r .test_set ./source/config.json`

mkdir tmp

if [ ${extension}='cpp' ]; then
	cd ./source
	ret=`file ${name}`
	if [ "${ret/text}" = "$ret" ]; then
		echo "it isn't source code" > ../tmp/compile_error.log
	else
		g++ -o ../a.out -w -O3 -std=c++14 ${name} 2> ../tmp/compile_error.log
	fi
	cd ..

	if [ -f a.out ]; then
		for (( i=1; i <= ${inputNum}; i++ )); do
			./a.out < ./input/${i}.in > ./tmp/${i}.out 2> /dev/null
		done

		./compare.py ./tmp ./answer ${inputNum}
	else
		cp ./tmp/compile_error.log ./output/compile_error.log
	fi

elif [ ${extension}='java' ]; then
	echo "empty"
fi