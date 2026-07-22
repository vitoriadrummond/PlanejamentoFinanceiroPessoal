async function buscarCategorias() {
    const { data, error } = await supabaseClient
        .from("categorias")
        .select("*")
        .order("nome");

    if (error) {
        throw error;
    }

    return data || [];
}

async function buscarCartoes() {
    const { data, error } = await supabaseClient
        .from("cartoes")
        .select("*")
        .order("nome");

    if (error) {
        throw error;
    }

    return data || [];
}

async function buscarRecorrencias() {
    const { data, error } = await supabaseClient
        .from("recorrencias")
        .select(`
            *,
            categorias (
                id,
                nome,
                cor,
                is_reserva
            ),
            cartoes (
                id,
                nome
            )
        `)
        .order("dia_vencimento");

    if (error) {
        throw error;
    }

    return data || [];
}

async function buscarLancamentos(meses) {
    const inicio = `${meses[0]}-01`;

    const [anoFinal, mesFinal] =
        meses[meses.length - 1]
            .split("-")
            .map(Number);

    const ultimoDia = new Date(
        anoFinal,
        mesFinal,
        0
    );

    const fim =
        `${ultimoDia.getFullYear()}-`
        + `${String(
            ultimoDia.getMonth() + 1
        ).padStart(2, "0")}-`
        + `${String(
            ultimoDia.getDate()
        ).padStart(2, "0")}`;

    const { data, error } = await supabaseClient
        .from("lancamentos")
        .select(`
            *,
            categorias (
                id,
                nome,
                cor,
                is_reserva
            ),
            cartoes (
                id,
                nome
            )
        `)
        .gte("competencia", inicio)
        .lte("competencia", fim)
        .order("vencimento", {
            ascending: true
        })
        .order("descricao", {
            ascending: true
        });

    if (error) {
        throw error;
    }

    return data || [];
}

async function inserirLancamento(objeto) {
    const { data, error } = await supabaseClient
        .from("lancamentos")
        .insert(objeto)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function atualizarLancamento(id, objeto) {
    const { data, error } = await supabaseClient
        .from("lancamentos")
        .update(objeto)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function excluirLancamento(id) {
    const { error } = await supabaseClient
        .from("lancamentos")
        .delete()
        .eq("id", id);

    if (error) {
        throw error;
    }
}

async function inserirRecorrencia(objeto) {
    const { data, error } = await supabaseClient
        .from("recorrencias")
        .insert(objeto)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function atualizarRecorrencia(id, objeto) {
    const { data, error } = await supabaseClient
        .from("recorrencias")
        .update(objeto)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function excluirRecorrencia(id) {
    /*
     * Lançamentos já confirmados podem continuar ligados à recorrência.
     * Antes de excluir a regra recorrente, removemos apenas esse vínculo.
     * Os lançamentos históricos permanecem salvos normalmente.
     */
    const { error: erroDesvincular } = await supabaseClient
        .from("lancamentos")
        .update({ recorrencia_id: null })
        .eq("recorrencia_id", id);

    if (erroDesvincular) {
        throw erroDesvincular;
    }

    const { error: erroExcluir } = await supabaseClient
        .from("recorrencias")
        .delete()
        .eq("id", id);

    if (erroExcluir) {
        throw erroExcluir;
    }
}

async function inserirCategoria(objeto) {
    const { data, error } = await supabaseClient
        .from("categorias")
        .insert(objeto)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function atualizarCategoria(id, objeto) {
    const { data, error } = await supabaseClient
        .from("categorias")
        .update(objeto)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function excluirCategoria(id) {
    const { error } = await supabaseClient
        .from("categorias")
        .delete()
        .eq("id", id);

    if (error) {
        throw error;
    }
}

async function inserirCartao(objeto) {
    const { data, error } = await supabaseClient
        .from("cartoes")
        .insert(objeto)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function atualizarCartao(id, objeto) {
    const { data, error } = await supabaseClient
        .from("cartoes")
        .update(objeto)
        .eq("id", id)
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}

async function excluirCartao(id) {
    const { error } = await supabaseClient
        .from("cartoes")
        .delete()
        .eq("id", id);

    if (error) {
        throw error;
    }
}

async function testarConexao() {
    const { error } = await supabaseClient
        .from("categorias")
        .select("id")
        .limit(1);

    if (error) {
        throw error;
    }
}
async function buscarConfiguracao(chave) {
    const { data, error } = await supabaseClient
        .from("configuracoes")
        .select("valor")
        .eq("chave", chave)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data?.valor ?? null;
}

async function salvarConfiguracao(chave, valor) {
    const { data, error } = await supabaseClient
        .from("configuracoes")
        .upsert(
            {
                chave,
                valor: String(valor)
            },
            {
                onConflict: "chave"
            }
        )
        .select()
        .single();

    if (error) {
        throw error;
    }

    return data;
}
